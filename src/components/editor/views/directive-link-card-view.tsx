/* src/components/editor/views/directive-link-card-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { Image } from 'lucide-react'
import { mediaUrl } from '~/lib/storage/media-url'
import {
  LinkCardComponent,
  parseLinkTone,
  parseLinkFavicon,
} from '~/components/post/component-resolver'
import { Placeholder, SelectedWrap } from './shared'

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
