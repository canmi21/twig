/* src/components/post/component-resolver.tsx */

import { useRouteContext } from '@tanstack/react-router'
import type { ComponentEntry } from '~/lib/compiler/index'
import { storageKey } from '~/lib/storage/storage-key'

function mediaUrl(cdnPrefix: string, src: string): string {
  const dotIdx = src.lastIndexOf('.')
  if (dotIdx === -1) return src

  const hash = src.slice(0, dotIdx)
  const ext = src.slice(dotIdx + 1)
  return `${cdnPrefix}/${storageKey(hash, ext)}`
}

function ImageComponent({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="
        aspect-video w-full rounded-md
        border border-border object-cover
        shadow-sm
      "
    />
  )
}

function VideoComponent({ url }: { url: string }) {
  return (
    <video controls preload="metadata">
      <source src={url} />
    </video>
  )
}

function AudioComponent({ url }: { url: string }) {
  return <audio controls preload="metadata" src={url} />
}

export function ComponentResolver({ entry }: { entry: ComponentEntry }) {
  const { cdnPublicUrl } = useRouteContext({ from: '__root__' })
  const prefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl

  const url = mediaUrl(prefix, entry.props.src)

  switch (entry.type) {
    case 'image':
      return <ImageComponent url={url} alt={entry.props.alt ?? ''} />
    case 'video':
      return <VideoComponent url={url} />
    case 'audio':
      return <AudioComponent url={url} />
    default:
      return (
        <div data-component={entry.type}>Unknown component: {entry.type}</div>
      )
  }
}
