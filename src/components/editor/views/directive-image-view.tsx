/* src/components/editor/views/directive-image-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { Image } from 'lucide-react'
import { mediaUrl } from '~/lib/storage/media-url'
import { ImageComponent } from '~/components/post/component-resolver'
import { Placeholder, SelectedWrap } from './shared'

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
