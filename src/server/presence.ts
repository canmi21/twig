/* src/server/presence.ts */

/* Durable Object for audience tracking.
 * Uses WebSocket Hibernation API — the DO sleeps between messages,
 * waking only on connect/disconnect/navigate events.
 *
 * Single global instance tracks all visitors (presence) and stores
 * the last visitor's geolocation for display on the homepage.
 */

import { DurableObject } from 'cloudflare:workers'
import { geoToTileIndex } from '~/lib/geo-tile'

interface ConnectionMeta {
  path: string
  cid: string | null
}

interface ClientMessage {
  type: 'init' | 'navigate'
  path: string
  cid?: string | null
}

interface PresenceMessage {
  type: 'presence'
  global: number
  article: number
}

export interface VisitorGeo {
  country: string
  city: string
}

interface VisitorGeoRequest extends VisitorGeo {
  lat?: number
  lon?: number
}

export interface GeoSwapResponse {
  previousGeo: VisitorGeo | null
  tiles: Record<string, number>
}

interface GeoTilesResponse {
  tiles: Record<string, number>
}

const LAST_GEO_KEY = 'last-geo'
const VISIT_COUNT_KEY = 'visit-count'
const TILE_PREFIX = 'tile:'
const READ_COUNT_PREFIX = 'read-count:'

// Periodic resync cadence. Defensive layer that catches any socket whose
// close event slipped (e.g. stale hibernation state) — the broadcast reads
// the authoritative `getWebSockets()` roster, so stuck UIs correct within
// this window. Also acts as a soft upper bound on how long an article's
// live reader count can drift from reality.
const PRESENCE_ALARM_MS = 60_000

// Exported as `actor` to match wrangler.jsonc class_name.
// Cloudflare dashboard shows "taki-actor".
// oxlint-disable-next-line typescript/class-name -- wrangler class_name binding
export class actor extends DurableObject<Record<string, unknown>> {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env)
    // Client heartbeat. `setWebSocketAutoResponse` matches on exact string
    // "ping" and replies "pong" without waking the DO — zero billed CPU per
    // heartbeat, while still refreshing CF's "last active" bookkeeping so
    // dead clients get reaped sooner.
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    )
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // HTTP count query (used by SSR loaders).
    // When cid is present, atomically increments the per-article read
    // counter and returns the post-increment value. DO is single-threaded,
    // so read-modify-write is naturally atomic.
    if (url.pathname === '/count') {
      const cid = url.searchParams.get('cid')
      const counts = this.computeCounts(cid)
      let reads = 0
      if (cid) {
        const key = `${READ_COUNT_PREFIX}${cid}`
        const prev = (await this.ctx.storage.get<number>(key)) ?? 0
        reads = prev + 1
        await this.ctx.storage.put(key, reads)
      }
      return Response.json({ ...counts, reads })
    }

    // Bulk read of all per-article read counts (used by admin dashboard).
    // Returns a map of cid -> count. Does not mutate state.
    if (url.pathname === '/read-counts' && request.method === 'GET') {
      const entries = await this.ctx.storage.list<number>({
        prefix: READ_COUNT_PREFIX,
      })
      const counts: Record<string, number> = {}
      for (const [key, value] of entries) {
        counts[key.slice(READ_COUNT_PREFIX.length)] = value
      }
      return Response.json({ counts })
    }

    // Admin override for a single article's read count.
    // Accepts any non-negative integer; clamps and floors the input.
    if (url.pathname === '/read-count' && request.method === 'PUT') {
      const cid = url.searchParams.get('cid')
      if (!cid) return new Response('cid required', { status: 400 })
      const body = (await request.json()) as { reads: unknown }
      const raw =
        typeof body.reads === 'number' ? body.reads : Number(body.reads)
      if (!Number.isFinite(raw)) {
        return new Response('invalid reads', { status: 400 })
      }
      const value = Math.max(0, Math.floor(raw))
      await this.ctx.storage.put(`${READ_COUNT_PREFIX}${cid}`, value)
      return Response.json({ reads: value })
    }

    // Admin action: force-close every live WebSocket. Clients reconnect
    // through the use-presence backoff and re-init their counts, which
    // is useful when ghost sockets from a historical bug are inflating
    // the roster and you cannot reset the whole DO (geo + tile + visit
    // data live here too).
    if (url.pathname === '/presence-reset' && request.method === 'POST') {
      const sockets = this.ctx.getWebSockets()
      const closed = sockets.length
      for (const ws of sockets) {
        try {
          ws.close(1000, 'presence-reset')
        } catch {
          // Already closing
        }
      }
      this.broadcastCounts()
      return Response.json({ closed })
    }

    // Increment site-wide visit counter and return total
    if (url.pathname === '/visit' && request.method === 'POST') {
      const prev = (await this.ctx.storage.get<number>(VISIT_COUNT_KEY)) ?? 0
      const next = prev + 1
      await this.ctx.storage.put(VISIT_COUNT_KEY, next)
      return Response.json({ totalVisits: next })
    }

    // Read current heat tiles without mutating visitor state
    if (url.pathname === '/tiles') {
      return Response.json({
        tiles: await this.readTiles(),
      } satisfies GeoTilesResponse)
    }

    // Swap last visitor geo + increment heat tile.
    // Atomic within a single DO instance — no race conditions.
    if (url.pathname === '/last-geo' && request.method === 'POST') {
      const incoming = (await request.json()) as VisitorGeoRequest
      const stored = await this.ctx.storage.get<VisitorGeo>(LAST_GEO_KEY)
      await this.ctx.storage.put(LAST_GEO_KEY, {
        country: incoming.country,
        city: incoming.city,
      } satisfies VisitorGeo)

      // Increment the visitor's heat tile if coordinates are available
      if (
        typeof incoming.lat === 'number' &&
        typeof incoming.lon === 'number' &&
        Number.isFinite(incoming.lat) &&
        Number.isFinite(incoming.lon)
      ) {
        const idx = geoToTileIndex(incoming.lon, incoming.lat)
        const key = `${TILE_PREFIX}${idx}`
        const prev = (await this.ctx.storage.get<number>(key)) ?? 0
        await this.ctx.storage.put(key, prev + 1)
      }

      // Return all heat tiles (only non-zero entries stored)
      return Response.json({
        previousGeo: stored ?? null,
        tiles: await this.readTiles(),
      } satisfies GeoSwapResponse)
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket or /count', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return

    // `ping` heartbeats are intercepted by setWebSocketAutoResponse and
    // never reach this handler — anything here is an application message.
    let msg: ClientMessage
    try {
      msg = JSON.parse(message)
    } catch {
      return
    }

    if (msg.type !== 'init' && msg.type !== 'navigate') return

    ws.serializeAttachment({
      path: msg.path,
      cid: msg.cid ?? null,
    } satisfies ConnectionMeta)

    this.broadcastCounts()
    await this.ensureAlarm()
  }

  async webSocketClose(ws: WebSocket) {
    // Attachment disappears with the socket — no storage cleanup needed.
    void ws
    this.broadcastCounts()
  }

  async webSocketError(ws: WebSocket) {
    void ws
    this.broadcastCounts()
  }

  async alarm() {
    this.broadcastCounts()
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + PRESENCE_ALARM_MS)
    }
  }

  private async ensureAlarm() {
    const existing = await this.ctx.storage.getAlarm()
    if (existing == null) {
      await this.ctx.storage.setAlarm(Date.now() + PRESENCE_ALARM_MS)
    }
  }

  private getMeta(ws: WebSocket): ConnectionMeta | null {
    return (ws.deserializeAttachment() as ConnectionMeta | null) ?? null
  }

  private computeCounts(targetCid?: string | null): {
    global: number
    article: number
  } {
    const sockets = this.ctx.getWebSockets()
    const global = sockets.length
    let article = 0

    if (targetCid) {
      for (const ws of sockets) {
        if (this.getMeta(ws)?.cid === targetCid) article++
      }
    }

    return { global, article }
  }

  private broadcastCounts() {
    const sockets = this.ctx.getWebSockets()
    const global = sockets.length

    // First pass: aggregate per-cid counts from attachments.
    const cidCounts = new Map<string, number>()
    const metaCache = new Map<WebSocket, ConnectionMeta | null>()
    for (const ws of sockets) {
      const meta = this.getMeta(ws)
      metaCache.set(ws, meta)
      if (meta?.cid) {
        cidCounts.set(meta.cid, (cidCounts.get(meta.cid) ?? 0) + 1)
      }
    }

    // Second pass: push personalized counts to each socket.
    for (const ws of sockets) {
      const meta = metaCache.get(ws) ?? null
      const article = meta?.cid ? (cidCounts.get(meta.cid) ?? 0) : 0

      const msg: PresenceMessage = { type: 'presence', global, article }
      try {
        ws.send(JSON.stringify(msg))
      } catch {
        // Connection already closed
      }
    }
  }

  private async readTiles(): Promise<Record<string, number>> {
    const tileEntries = await this.ctx.storage.list<number>({
      prefix: TILE_PREFIX,
    })
    const tiles: Record<string, number> = {}
    for (const [key, count] of tileEntries) {
      tiles[key.slice(TILE_PREFIX.length)] = count
    }
    return tiles
  }
}
