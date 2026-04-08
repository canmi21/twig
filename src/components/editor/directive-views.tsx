/* src/components/editor/directive-views.tsx */

/* src/components/editor/directive-views.tsx
 *
 * React NodeView components for rendering custom directives
 * inside the Milkdown WYSIWYG editor.
 *
 * Reuses the same rendering components as the published post page
 * (from component-resolver.tsx) so editor and post look identical.
 */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { Image, Video, AudioLines, Package } from 'lucide-react'
import { mediaUrl } from '~/lib/storage/media-url'
import {
  ImageComponent,
  VideoComponent,
  AudioComponent,
  LinkCardComponent,
  GitHubCardComponent,
  parseLinkTone,
  parseLinkFavicon,
} from '~/components/post/component-resolver'
import { CargoWidget } from '~/components/post/cargo'

// ---------------------------------------------------------------------------
// Shared placeholder (used when attrs are missing)
// ---------------------------------------------------------------------------

const blockClass =
  'my-4 flex items-center gap-3 rounded-lg border border-border bg-raised px-4 py-3 text-sm text-secondary select-none'

const selectedRing = 'ring-2 ring-accent/40'

function Placeholder({
  icon,
  label,
  selected,
}: {
  icon: React.ReactNode
  label: string
  selected: boolean
}) {
  return (
    <div className={`${blockClass} ${selected ? selectedRing : ''}`}>
      {icon}
      <span className="font-medium text-primary">{label}</span>
    </div>
  )
}

function SelectedWrap({
  selected,
  children,
}: {
  selected: boolean
  children: React.ReactNode
}) {
  if (!selected) return <>{children}</>
  return <div className="rounded-xl ring-2 ring-accent/40">{children}</div>
}

// ---------------------------------------------------------------------------
// Image — reuses ImageComponent from post renderer
// ---------------------------------------------------------------------------

export function DirectiveImageView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src, alt } = node.attrs as { src: string; alt: string }

  if (!src || src === 'uploading...') {
    return (
      <Placeholder
        icon={<Image className="size-5 shrink-0" strokeWidth={1.5} />}
        label={src === 'uploading...' ? 'Uploading...' : 'Image'}
        selected={selected}
      />
    )
  }

  const url = mediaUrl(cdnPrefix, src)
  return (
    <SelectedWrap selected={selected}>
      <ImageComponent url={url} alt={alt} />
    </SelectedWrap>
  )
}

// ---------------------------------------------------------------------------
// Video — reuses VideoComponent
// ---------------------------------------------------------------------------

export function DirectiveVideoView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src } = node.attrs as { src: string }

  if (!src) {
    return (
      <Placeholder
        icon={<Video className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Video"
        selected={selected}
      />
    )
  }

  const url = mediaUrl(cdnPrefix, src)
  return (
    <SelectedWrap selected={selected}>
      <VideoComponent url={url} />
    </SelectedWrap>
  )
}

// ---------------------------------------------------------------------------
// Audio — reuses AudioComponent
// ---------------------------------------------------------------------------

export function DirectiveAudioView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src } = node.attrs as { src: string }

  if (!src) {
    return (
      <Placeholder
        icon={<AudioLines className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Audio"
        selected={selected}
      />
    )
  }

  const url = mediaUrl(cdnPrefix, src)
  return (
    <SelectedWrap selected={selected}>
      <AudioComponent url={url} />
    </SelectedWrap>
  )
}

// ---------------------------------------------------------------------------
// Link Card — reuses LinkCardComponent
// ---------------------------------------------------------------------------

export function DirectiveLinkCardView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src, url, title, tone, favicon } = node.attrs as {
    src: string
    url: string
    title: string
    tone: string
    favicon: string
  }

  if (!url && !title) {
    return (
      <Placeholder
        icon={<Image className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Link Card"
        selected={selected}
      />
    )
  }

  const coverUrl = src?.startsWith('http')
    ? src
    : mediaUrl(cdnPrefix, src || '')

  return (
    <SelectedWrap selected={selected}>
      <LinkCardComponent
        coverUrl={coverUrl}
        url={url || '#'}
        title={title || ''}
        tone={parseLinkTone(tone)}
        favicon={parseLinkFavicon(favicon)}
      />
    </SelectedWrap>
  )
}

// ---------------------------------------------------------------------------
// GitHub Card — reuses GitHubCardComponent (fetches live data)
// ---------------------------------------------------------------------------

export function DirectiveGithubView() {
  const { node, selected } = useNodeViewContext()
  const {
    repo,
    ref: gitRef,
    title,
    align,
  } = node.attrs as {
    repo: string
    ref: string
    title: string
    align: string
  }

  if (!repo) {
    return (
      <Placeholder
        icon={<Package className="size-5 shrink-0" strokeWidth={1.5} />}
        label="GitHub"
        selected={selected}
      />
    )
  }

  return (
    <SelectedWrap selected={selected}>
      <GitHubCardComponent
        repo={repo}
        gitRef={gitRef || undefined}
        title={title || undefined}
        align={(align as 'left' | 'center' | 'right') || 'center'}
      />
    </SelectedWrap>
  )
}

// ---------------------------------------------------------------------------
// Cargo — reuses CargoWidget
// ---------------------------------------------------------------------------

export function DirectiveCargoView() {
  const { node, selected } = useNodeViewContext()
  const { crate, version } = node.attrs as { crate: string; version: string }

  if (!crate) {
    return (
      <Placeholder
        icon={<Package className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Cargo Crate"
        selected={selected}
      />
    )
  }

  return (
    <SelectedWrap selected={selected}>
      <CargoWidget crate={crate} version={version || undefined} />
    </SelectedWrap>
  )
}
