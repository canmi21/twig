/* src/components/editor/views/code-block-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { SvgBoardComponent } from '~/components/post/component-resolver'
import { TokeiWidget } from '~/components/post/tokei'
import { SelectedWrap } from './shared'

export function CodeBlockView() {
  const { node, selected, contentRef } = useNodeViewContext()
  const lang = (node.attrs.language as string) || ''

  // Get the text content from the code block node
  const code = node.textContent

  if (lang === 'svg-board' && code) {
    return (
      <SelectedWrap selected={selected}>
        <SvgBoardComponent code={code} />
      </SelectedWrap>
    )
  }

  if (lang === 'tokei' && code) {
    return (
      <SelectedWrap selected={selected}>
        <TokeiWidget raw={code} />
      </SelectedWrap>
    )
  }

  // Default: editable code block
  return (
    <pre className={selected ? 'ring-2 ring-accent/40' : ''}>
      <code ref={contentRef} />
    </pre>
  )
}
