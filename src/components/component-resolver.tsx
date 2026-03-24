/* src/components/component-resolver.tsx */

import type { ComponentEntry } from '~/lib/compiler/index'
import { storageKey } from '~/lib/database/storage-key'

const CDN_PREFIX = import.meta.env.DEV ? '/api/object' : 'https://cdn.canmi.net'

function mediaUrl(src: string): string {
  // src is "{hash}.{ext}" — derive storage path for the URL
  const dotIdx = src.lastIndexOf('.')
  if (dotIdx === -1) return src

  const hash = src.slice(0, dotIdx)
  const ext = src.slice(dotIdx + 1)
  return `${CDN_PREFIX}/${storageKey(hash, ext)}`
}

function ImageComponent({ props }: { props: ComponentEntry['props'] }) {
  return <img src={mediaUrl(props.src)} alt={props.alt ?? ''} loading="lazy" />
}

function VideoComponent({ props }: { props: ComponentEntry['props'] }) {
  return (
    <video controls preload="metadata">
      <source src={mediaUrl(props.src)} />
    </video>
  )
}

function AudioComponent({ props }: { props: ComponentEntry['props'] }) {
  return <audio controls preload="metadata" src={mediaUrl(props.src)} />
}

export function ComponentResolver({ entry }: { entry: ComponentEntry }) {
  switch (entry.type) {
    case 'image':
      return <ImageComponent props={entry.props} />
    case 'video':
      return <VideoComponent props={entry.props} />
    case 'audio':
      return <AudioComponent props={entry.props} />
    default:
      return (
        <div data-component={entry.type}>Unknown component: {entry.type}</div>
      )
  }
}
