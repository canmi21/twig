/* src/components/editor/views/directive-audio-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { AudioLines } from 'lucide-react'
import { mediaUrl } from '~/lib/storage/media-url'
import { AudioComponent } from '~/components/post/component-resolver'
import { Placeholder, SelectedWrap } from './shared'

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
