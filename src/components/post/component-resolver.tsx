/* src/components/post/component-resolver.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useRef, useCallback } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { motion } from 'motion/react'
import type { ComponentEntry } from '~/lib/compiler/index'
import { mediaUrl } from '~/lib/storage/media-url'

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
