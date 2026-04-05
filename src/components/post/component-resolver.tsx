/* src/components/post/component-resolver.tsx */

/* eslint-disable better-tailwindcss/no-unknown-classes */

import { useState, useRef, useCallback } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
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

function LinkCardComponent({
  coverUrl,
  url,
  title,
}: {
  coverUrl: string
  url: string
  title: string
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
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="post-media__cover absolute inset-0 size-full object-cover"
      />
      <div className="post-media__shadow pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 text-white">
        <div className="flex min-w-0 items-center gap-1.5">
          <img
            src={`/api/favicon/${domain}`}
            alt=""
            className="post-media__favicon size-4 shrink-0 drop-shadow-sm"
          />
          <span className="truncate text-sm font-medium drop-shadow-sm">
            {title}
          </span>
        </div>
        <ArrowUpRight
          className="size-4 shrink-0 drop-shadow-sm"
          strokeWidth={2}
        />
      </div>
    </a>
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
    case 'linkcard': {
      const src = entry.props.src ?? ''
      const coverUrl = src.startsWith('http') ? src : url
      return (
        <LinkCardComponent
          coverUrl={coverUrl}
          url={entry.props.url ?? '#'}
          title={entry.props.title ?? ''}
        />
      )
    }
    default:
      return (
        <div data-component={entry.type}>Unknown component: {entry.type}</div>
      )
  }
}
