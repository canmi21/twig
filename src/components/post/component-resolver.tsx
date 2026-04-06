/* src/components/post/component-resolver.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  ArrowUpRight,
  Star,
  GitFork,
  Scale,
  Clock,
  CircleDot,
  GitCommitHorizontal,
} from 'lucide-react'
import type { GitHubRepoData } from '~/routes/api/github/$.ts'
import type { ComponentEntry } from '~/lib/compiler/index'
import { mediaUrl } from '~/lib/storage/media-url'

type LinkTone = 'light' | 'dark'
type LinkFavicon =
  | { kind: 'proxy' }
  | { kind: 'hidden' }
  | { kind: 'custom'; src: string }

function parseLinkTone(value: string | undefined): LinkTone | undefined {
  if (value === 'light' || value === 'dark') {
    return value
  }

  return undefined
}

function parseLinkFavicon(value: string | undefined): LinkFavicon {
  if (value == null || value === '' || value === 'true') {
    return { kind: 'proxy' }
  }

  if (value === 'false') {
    return { kind: 'hidden' }
  }

  return { kind: 'custom', src: value }
}

function ImageComponent({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Handle both fresh loads and already-cached images
  const handleRef = useCallback((el: HTMLImageElement | null) => {
    ;(imgRef as React.MutableRefObject<HTMLImageElement | null>).current = el
    if (el?.complete && el.naturalWidth > 0) setLoaded(true)
  }, [])

  return (
    <motion.img
      ref={handleRef}
      src={url}
      alt={alt}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      initial={false}
      animate={
        loaded
          ? { opacity: 1, filter: 'blur(0px)' }
          : { opacity: 0.01, filter: 'blur(8px)' }
      }
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="
        post-media post-media--image
        aspect-video w-full rounded-xl
        border-2 border-border object-cover
        shadow-sm
      "
    />
  )
}

function VideoComponent({ url }: { url: string }) {
  return (
    <video className="post-media post-media--video" controls preload="metadata">
      <source src={url} />
    </video>
  )
}

function AudioComponent({ url }: { url: string }) {
  return (
    <audio
      className="post-media post-media--audio"
      controls
      preload="metadata"
      src={url}
    />
  )
}

import { TokeiWidget } from './tokei'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  PHP: '#4f5d95',
  Shell: '#89e051',
  Lua: '#000080',
  Zig: '#ec915c',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Scala: '#c22d40',
  OCaml: '#3be133',
  TOML: '#9c4221',
  JSON: '#292929',
  Makefile: '#427819',
  Just: '#384d54',
  Markdown: '#083fa1',
  BASH: '#89e051',
  TSX: '#3178c6',
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function repoDisplayName(repo: string): string {
  const name = repo.split('/')[1] ?? repo
  return name
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

type CardAlign = 'left' | 'center' | 'right'

function GitHubCardComponent({
  repo,
  gitRef,
  title,
  align = 'center',
}: {
  repo: string
  gitRef?: string
  title?: string
  align?: CardAlign
}) {
  const [data, setData] = useState<GitHubRepoData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/github/${repo}`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json() as Promise<GitHubRepoData>
      })
      .then(setData)
      .catch(() => setError(true))
  }, [repo])

  const href = gitRef
    ? `https://github.com/${repo}/tree/${gitRef}`
    : `https://github.com/${repo}`

  if (error) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`github-card github-card--error github-card--${align}`}
      >
        <span className="text-[13px] text-primary opacity-(--opacity-muted)">
          {repo}
        </span>
      </a>
    )
  }

  if (!data) {
    return (
      <div
        className={`github-card github-card--loading github-card--${align}`}
      />
    )
  }

  const langColor = data.language ? LANG_COLORS[data.language] : undefined

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`github-card github-card--${align} group`}
    >
      <div className="github-card__header">
        <span className="github-card__name">
          {title || repoDisplayName(repo)}
        </span>
        <span className="github-card__fullname">{data.fullName}</span>
      </div>
      {gitRef && (
        <span className="github-card__ref">
          <GitCommitHorizontal className="size-3" strokeWidth={2} />
          {gitRef.length > 8 ? gitRef.slice(0, 7) : gitRef}
        </span>
      )}
      {data.description && (
        <p className="github-card__desc">{data.description}</p>
      )}
      <div className="github-card__meta">
        {data.language && (
          <span className="github-card__meta-item">
            <span
              className="github-card__lang-dot"
              style={{ backgroundColor: langColor ?? 'var(--color-tertiary)' }}
            />
            {data.language}
          </span>
        )}
        <span className="github-card__meta-item">
          <Star className="size-3.5" strokeWidth={2} />
          {formatCount(data.stars)}
        </span>
        <span className="github-card__meta-item">
          <GitFork className="size-3.5" strokeWidth={2} />
          {formatCount(data.forks)}
        </span>
        {data.license && data.license !== 'NOASSERTION' && (
          <span className="github-card__meta-item">
            <Scale className="size-3.5" strokeWidth={2} />
            {data.license}
          </span>
        )}
        <span className="github-card__meta-item">
          <CircleDot className="size-3.5" strokeWidth={2} />
          {formatCount(data.openIssues)}
        </span>
        <span className="github-card__meta-item">
          <Clock className="size-3.5" strokeWidth={2} />
          {new Date(data.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
      <ArrowUpRight
        className="absolute right-3 bottom-3 size-4 shrink-0 text-primary opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-(--opacity-muted)"
        strokeWidth={2}
      />
    </a>
  )
}

function SvgBoardComponent({ code }: { code: string }) {
  // SVG source from trusted author-written content,
  // same trust model as the compiled HTML pipeline.
  return (
    <div
      className="post-media post-media--svg-board"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  )
}

function LinkCardComponent({
  coverUrl,
  url,
  title,
  tone,
  favicon,
}: {
  coverUrl: string
  url: string
  title: string
  tone?: LinkTone
  favicon: LinkFavicon
}) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleRef = useCallback((el: HTMLImageElement | null) => {
    ;(imgRef as React.MutableRefObject<HTMLImageElement | null>).current = el
    if (el?.complete && el.naturalWidth > 0) setLoaded(true)
  }, [])

  let domain: string
  try {
    domain = new URL(url).hostname
  } catch {
    domain = url
  }

  const faviconQuery = tone ? `?tone=${tone}` : ''
  const overlayToneClass = tone === 'dark' ? 'text-zinc-950' : 'text-white'
  const overlayDepthClass = tone === 'dark' ? '' : 'drop-shadow-sm'
  const faviconSrc =
    favicon.kind === 'proxy'
      ? `/api/favicon/${domain}${faviconQuery}`
      : favicon.kind === 'custom'
        ? favicon.src
        : null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        post-media post-media--image group
        relative block aspect-video w-full overflow-hidden rounded-xl
        border-2 border-border
      "
    >
      <motion.img
        ref={handleRef}
        src={coverUrl}
        alt={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        initial={false}
        animate={
          loaded
            ? { opacity: 1, filter: 'blur(0px)' }
            : { opacity: 0.01, filter: 'blur(8px)' }
        }
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="post-media__cover absolute inset-0 size-full object-cover"
      />
      <div className="post-media__shadow pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
      <div
        className={`pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 ${overlayToneClass}`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {faviconSrc ? (
            <img
              src={faviconSrc}
              alt=""
              className={`post-media__favicon size-4 shrink-0 ${overlayDepthClass}`}
            />
          ) : null}
          <span className={`truncate text-sm font-medium ${overlayDepthClass}`}>
            {title}
          </span>
        </div>
        <ArrowUpRight
          className={`size-4 shrink-0 ${overlayDepthClass}`}
          strokeWidth={2}
        />
      </div>
    </a>
  )
}

export function ComponentResolver({ entry }: { entry: ComponentEntry }) {
  const { cdnPublicUrl } = useRouteContext({ from: '__root__' })
  const prefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl

  // Components without media src — handle before mediaUrl
  if (entry.type === 'github') {
    return (
      <GitHubCardComponent
        repo={entry.props.repo}
        gitRef={entry.props.ref}
        title={entry.props.title}
        align={(entry.props.align as CardAlign) || 'center'}
      />
    )
  }
  if (entry.type === 'tokei') {
    return (
      <TokeiWidget
        raw={entry.props.code}
        view={(entry.props.view as 'treemap' | 'bar' | 'table') || 'treemap'}
      />
    )
  }
  if (entry.type === 'svg-board') {
    return <SvgBoardComponent code={entry.props.code} />
  }

  const url = mediaUrl(prefix, entry.props.src)

  switch (entry.type) {
    case 'image':
      return <ImageComponent url={url} alt={entry.props.alt ?? ''} />
    case 'video':
      return <VideoComponent url={url} />
    case 'audio':
      return <AudioComponent url={url} />
    case 'linkcard': {
      const src = entry.props.src ?? ''
      const coverUrl = src.startsWith('http') ? src : url
      const tone = parseLinkTone(entry.props.tone)
      const favicon = parseLinkFavicon(entry.props.favicon)
      return (
        <LinkCardComponent
          coverUrl={coverUrl}
          url={entry.props.url ?? '#'}
          title={entry.props.title ?? ''}
          tone={tone}
          favicon={favicon}
        />
      )
    }
    default:
      return (
        <div data-component={entry.type}>Unknown component: {entry.type}</div>
      )
  }
}
