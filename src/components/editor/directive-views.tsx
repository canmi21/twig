/* src/components/editor/directive-views.tsx */

/* src/components/editor/directive-views.tsx
 *
 * React NodeView components for rendering custom directives
 * inside the Milkdown WYSIWYG editor.
 */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import {
  Image,
  Video,
  AudioLines,
  ExternalLink,
  GitFork,
  Package,
} from 'lucide-react'
import { mediaUrl } from '~/lib/storage/media-url'

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const blockClass =
  'my-4 flex items-center gap-3 rounded-lg border border-border bg-raised px-4 py-3 text-sm text-secondary select-none'

const selectedRing = 'ring-2 ring-accent/40'

function DirectiveBlock({
  icon,
  label,
  detail,
  selected,
}: {
  icon: React.ReactNode
  label: string
  detail?: string
  selected: boolean
}) {
  return (
    <div className={`${blockClass} ${selected ? selectedRing : ''}`}>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-primary">{label}</div>
        {detail && (
          <div className="truncate text-xs opacity-(--opacity-muted)">
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export function DirectiveImageView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src, alt } = node.attrs as { src: string; alt: string }

  if (!src || src === 'uploading...') {
    return (
      <DirectiveBlock
        icon={<Image className="size-5 shrink-0" strokeWidth={1.5} />}
        label={src === 'uploading...' ? 'Uploading...' : 'Image'}
        detail={alt || undefined}
        selected={selected}
      />
    )
  }

  const url = mediaUrl(cdnPrefix, src)
  return (
    <figure
      className={`my-4 overflow-hidden rounded-xl border border-border ${selected ? selectedRing : ''}`}
    >
      <img src={url} alt={alt} loading="lazy" className="w-full object-cover" />
      {alt && (
        <figcaption className="bg-raised px-3 py-1.5 text-xs text-secondary">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------

export function DirectiveVideoView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src } = node.attrs as { src: string }

  if (!src) {
    return (
      <DirectiveBlock
        icon={<Video className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Video"
        selected={selected}
      />
    )
  }

  const url = mediaUrl(cdnPrefix, src)
  return (
    <div
      className={`my-4 overflow-hidden rounded-xl border border-border ${selected ? selectedRing : ''}`}
    >
      <video src={url} controls className="w-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export function DirectiveAudioView({ cdnPrefix }: { cdnPrefix: string }) {
  const { node, selected } = useNodeViewContext()
  const { src } = node.attrs as { src: string }

  if (!src) {
    return (
      <DirectiveBlock
        icon={<AudioLines className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Audio"
        selected={selected}
      />
    )
  }

  const url = mediaUrl(cdnPrefix, src)
  return (
    <div
      className={`my-4 rounded-xl border border-border bg-raised p-3 ${selected ? selectedRing : ''}`}
    >
      <audio src={url} controls className="w-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Link Card
// ---------------------------------------------------------------------------

export function DirectiveLinkCardView() {
  const { node, selected } = useNodeViewContext()
  const { url, title } = node.attrs as { url: string; title: string }

  return (
    <DirectiveBlock
      icon={<ExternalLink className="size-5 shrink-0" strokeWidth={1.5} />}
      label={title || 'Link Card'}
      detail={url || undefined}
      selected={selected}
    />
  )
}

// ---------------------------------------------------------------------------
// GitHub Card
// ---------------------------------------------------------------------------

export function DirectiveGithubView() {
  const { node, selected } = useNodeViewContext()
  const { repo } = node.attrs as { repo: string }

  return (
    <DirectiveBlock
      icon={<GitFork className="size-5 shrink-0" strokeWidth={1.5} />}
      label={repo || 'GitHub'}
      detail={repo ? `github.com/${repo}` : undefined}
      selected={selected}
    />
  )
}

// ---------------------------------------------------------------------------
// Cargo Card
// ---------------------------------------------------------------------------

export function DirectiveCargoView() {
  const { node, selected } = useNodeViewContext()
  const { crate, version } = node.attrs as { crate: string; version: string }

  return (
    <DirectiveBlock
      icon={<Package className="size-5 shrink-0" strokeWidth={1.5} />}
      label={crate || 'Cargo Crate'}
      detail={version ? `v${version}` : undefined}
      selected={selected}
    />
  )
}
