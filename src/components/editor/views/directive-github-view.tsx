/* src/components/editor/views/directive-github-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { Package } from 'lucide-react'
import { GitHubCardComponent } from '~/components/post/component-resolver'
import { Placeholder, SelectedWrap } from './shared'

export function DirectiveGithubView() {
  const { node, selected } = useNodeViewContext()
  const {
    repo,
    ref: gitRef,
    title,
    align,
  } = node.attrs as {
    repo: string
    ref: string
    title: string
    align: string
  }

  if (!repo) {
    return (
      <Placeholder
        icon={<Package className="size-5 shrink-0" strokeWidth={1.5} />}
        label="GitHub"
        selected={selected}
      />
    )
  }

  return (
    <SelectedWrap selected={selected}>
      <GitHubCardComponent
        repo={repo}
        gitRef={gitRef || undefined}
        title={title || undefined}
        align={(align as 'left' | 'center' | 'right') || 'center'}
      />
    </SelectedWrap>
  )
}
