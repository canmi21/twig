/* src/components/editor/views/directive-cargo-view.tsx */

import { useNodeViewContext } from '@prosemirror-adapter/react'
import { Package } from 'lucide-react'
import { CargoWidget } from '~/components/post/cargo'
import { Placeholder, SelectedWrap } from './shared'

export function DirectiveCargoView() {
  const { node, selected } = useNodeViewContext()
  const { crate, version } = node.attrs as { crate: string; version: string }

  if (!crate) {
    return (
      <Placeholder
        icon={<Package className="size-5 shrink-0" strokeWidth={1.5} />}
        label="Cargo Crate"
        selected={selected}
      />
    )
  }

  return (
    <SelectedWrap selected={selected}>
      <CargoWidget crate={crate} version={version || undefined} />
    </SelectedWrap>
  )
}
