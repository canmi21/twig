/* src/routes/api/crates/$.ts */

import { createFileRoute } from '@tanstack/react-router'

/** 1 week in seconds. */
const CACHE_MAX_AGE = 604_800
const MAX_DEPTH = 3
const MAX_DEPS = 200
const INDEX_TIMEOUT = 8_000
const SIZE_TIMEOUT = 5_000
const CONCURRENCY = 10

const INDEX_BASE = 'https://index.crates.io'
const STATIC_BASE = 'https://static.crates.io/crates'

// --- Fetch with timeout ---

function timedFetch(
  url: string,
  init?: RequestInit,
  timeout = INDEX_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  )
}

// --- Concurrency-limited parallel map ---

async function pMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = CONCURRENCY,
): Promise<R[]> {
  const results = Array.from<R>({ length: items.length })
  let idx = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (idx < items.length) {
        const i = idx++
        // oxlint-disable-next-line no-await-in-loop -- intentional: limits concurrency by awaiting each item within a worker
        results[i] = await fn(items[i])
      }
    },
  )
  await Promise.all(workers)
  return results
}

// --- Sparse index path computation ---

function indexPath(name: string): string {
  const lower = name.toLowerCase()
  const len = lower.length
  if (len === 1) return `1/${lower}`
  if (len === 2) return `2/${lower}`
  if (len === 3) return `3/${lower[0]}/${lower}`
  return `${lower.slice(0, 2)}/${lower.slice(2, 4)}/${lower}`
}

// --- Version range -> base version ---

function baseVersion(req: string): string {
  const raw = req
    .replace(/^[\^~>=<! ]+/, '')
    .split(',')[0]
    .trim()
  const parts = raw.split('.')
  while (parts.length < 3) parts.push('0')
  return parts.join('.')
}

// --- Types ---

interface IndexEntry {
  name: string
  vers: string
  deps: Array<{
    name: string
    req: string
    kind: string | null
    optional: boolean
    target: string | null
    features: string[]
    package?: string
  }>
  features: Record<string, string[]>
  yanked: boolean
  rust_version?: string | null
}

export interface CrateDepInfo {
  name: string
  version: string
  kind: 'normal' | 'dev' | 'build'
  optional: boolean
  target: string | null
  featuresRequested: string[]
  crateSize: number | null
  depth: number
}

export interface CrateInfo {
  name: string
  version: string
  rustVersion: string | null
  features: Record<string, string[]>
  deps: CrateDepInfo[]
  totalDepSize: number
}

// --- Index cache (within a single request) ---

const indexCache = new Map<string, IndexEntry[]>()

async function fetchIndex(name: string): Promise<IndexEntry[]> {
  const key = name.toLowerCase()
  const cached = indexCache.get(key)
  if (cached) return cached

  try {
    const url = `${INDEX_BASE}/${indexPath(name)}`
    const res = await timedFetch(url, {
      headers: { accept: 'application/json' },
    })
    if (!res.ok) return []
    const text = await res.text()
    const entries = text
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as IndexEntry)
    indexCache.set(key, entries)
    return entries
  } catch {
    return []
  }
}

function resolveVersion(
  entries: IndexEntry[],
  version?: string,
): IndexEntry | null {
  if (version) {
    return entries.find((e) => e.vers === version && !e.yanked) ?? null
  }
  for (let i = entries.length - 1; i >= 0; i--) {
    if (!entries[i].yanked) return entries[i]
  }
  return null
}

async function fetchCrateSize(
  name: string,
  version: string,
): Promise<number | null> {
  try {
    // GET instead of HEAD: Fastly CDN omits content-length on HEAD.
    // Body is canceled immediately so only headers are transferred.
    const url = `${STATIC_BASE}/${name}/${name}-${version}.crate`
    const res = await timedFetch(url, undefined, SIZE_TIMEOUT)
    const cl = res.headers.get('content-length')
    await res.body?.cancel()
    if (!res.ok) return null
    return cl ? Number(cl) : null
  } catch {
    return null
  }
}

// --- BFS recursive dependency resolution ---

interface DepSeed {
  name: string
  req: string
  kind: 'normal' | 'dev' | 'build'
  optional: boolean
  target: string | null
  featuresRequested: string[]
  depth: number
  resolvedVersion: string | null
}

async function resolveAllDeps(rootEntry: IndexEntry): Promise<CrateDepInfo[]> {
  const seen = new Map<string, DepSeed>() // name -> best seed
  const queue: DepSeed[] = []
  // Size promises started eagerly during BFS, awaited at the end
  const sizePromises = new Map<string, Promise<number | null>>()

  // Seed with root's direct deps (all kinds)
  for (const d of rootEntry.deps) {
    const name = d.package ?? d.name
    const kind = (d.kind ?? 'normal') as 'normal' | 'dev' | 'build'
    const seed: DepSeed = {
      name,
      req: d.req,
      kind,
      optional: d.optional,
      target: d.target,
      featuresRequested: d.features,
      depth: 0,
      resolvedVersion: null,
    }
    if (!seen.has(name)) {
      seen.set(name, seed)
      queue.push(seed)
    }
  }

  // BFS: only recurse into normal + build deps (dev deps don't propagate).
  // Size fetches fire eagerly as soon as a version is resolved, overlapping
  // with subsequent BFS levels instead of running as a separate phase.
  let head = 0
  while (head < queue.length && seen.size < MAX_DEPS) {
    // Process current level in parallel
    const batch: DepSeed[] = []
    const currentDepth = queue[head].depth
    while (head < queue.length && queue[head].depth === currentDepth) {
      batch.push(queue[head])
      head++
    }

    if (currentDepth >= MAX_DEPTH) break

    // Only recurse non-dev, non-optional deps
    const toResolve = batch.filter((s) => s.kind !== 'dev' && !s.optional)

    // oxlint-disable-next-line no-await-in-loop -- BFS levels must resolve sequentially
    const results = await pMap(toResolve, async (s) => {
      const entries = await fetchIndex(s.name)
      const ver = baseVersion(s.req)
      const entry = resolveVersion(entries, ver) ?? resolveVersion(entries)
      if (entry) {
        s.resolvedVersion = entry.vers
        // Fire size fetch eagerly — runs concurrently with later BFS levels
        sizePromises.set(s.name, fetchCrateSize(s.name, entry.vers))
      }
      return { seed: s, entry }
    })

    for (const { entry } of results) {
      if (!entry) continue
      for (const d of entry.deps) {
        const name = d.package ?? d.name
        const kind = (d.kind ?? 'normal') as 'normal' | 'dev' | 'build'
        // Skip dev deps of transitive dependencies
        if (kind === 'dev') continue
        if (seen.has(name)) continue
        if (seen.size >= MAX_DEPS) break

        const childSeed: DepSeed = {
          name,
          req: d.req,
          kind,
          optional: d.optional,
          target: d.target,
          featuresRequested: d.features,
          depth: currentDepth + 1,
          resolvedVersion: null,
        }
        seen.set(name, childSeed)
        queue.push(childSeed)
      }
    }
  }

  // Resolve remaining deps that BFS skipped (optional deps, final depth level)
  const unresolved = [...seen.values()].filter(
    (s) => !s.resolvedVersion && !sizePromises.has(s.name),
  )
  if (unresolved.length > 0) {
    await pMap(unresolved, async (s) => {
      const entries = await fetchIndex(s.name)
      const entry =
        resolveVersion(entries, baseVersion(s.req)) ?? resolveVersion(entries)
      const version = entry?.vers ?? baseVersion(s.req)
      s.resolvedVersion = version
      sizePromises.set(s.name, fetchCrateSize(s.name, version))
    })
  }

  // Await all size promises and assemble final results
  const deps: CrateDepInfo[] = []
  for (const s of seen.values()) {
    // oxlint-disable-next-line no-await-in-loop -- sequential await on already-started promises
    const size = await (sizePromises.get(s.name) ?? Promise.resolve(null))
    deps.push({
      name: s.name,
      version: s.resolvedVersion ?? baseVersion(s.req),
      kind: s.kind,
      optional: s.optional,
      target: s.target,
      featuresRequested: s.featuresRequested,
      crateSize: size,
      depth: s.depth,
    })
  }

  return deps
}

// --- Main handler ---

async function resolveCrate(
  name: string,
  version?: string,
): Promise<CrateInfo | null> {
  // Clear per-request cache
  indexCache.clear()

  const entries = await fetchIndex(name)
  if (entries.length === 0) return null

  const entry = resolveVersion(entries, version)
  if (!entry) return null

  const deps = await resolveAllDeps(entry)
  const totalDepSize = deps.reduce((sum, d) => sum + (d.crateSize ?? 0), 0)

  return {
    name: entry.name,
    version: entry.vers,
    rustVersion: entry.rust_version ?? null,
    features: entry.features,
    deps,
    totalDepSize,
  }
}

export const Route = createFileRoute('/api/crates/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = params._splat
        if (!splat) {
          return Response.json({ error: 'Missing crate name' }, { status: 400 })
        }

        const parts = splat.split('/')
        const name = parts[0]
        const version = parts[1]

        if (!name || !/^[\w-]+$/.test(name)) {
          return Response.json({ error: 'Invalid crate name' }, { status: 400 })
        }

        try {
          const data = await resolveCrate(name, version)
          if (!data) {
            return Response.json(
              { error: 'Crate or version not found' },
              { status: 404 },
            )
          }

          return Response.json(data, {
            headers: {
              'cache-control': `public, max-age=${CACHE_MAX_AGE}`,
            },
          })
        } catch {
          return Response.json(
            { error: 'Failed to fetch crate info' },
            { status: 502 },
          )
        }
      },
    },
  },
})
