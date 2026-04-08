/* src/components/editor/views/directive-video-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { Video } from 'lucide-react'
import { mediaUrl } from '~/lib/storage/media-url'
import { VideoComponent } from '~/components/post/component-resolver'
import { Placeholder, SelectedWrap } from './shared'

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
