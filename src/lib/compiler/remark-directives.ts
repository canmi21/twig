/* src/lib/compiler/remark-directives.ts */

import type { Root as MdastRoot } from 'mdast'
import type { Plugin } from 'unified'

export interface ComponentEntry {
  type: string
  props: Record<string, string>
  index: number
}

const mediaDirectives = new Set(['image', 'video', 'audio', 'linkcard'])

export const remarkExtractDirectives: Plugin<
  [{ components: ComponentEntry[] }],
  MdastRoot
> = (options) => (tree) => {
  const children = tree.children
  for (let i = 0; i < children.length; i++) {
    const node = children[i] as MdastRoot['children'][number] & {
      name?: string
      attributes?: Record<string, string>
    }

    if (node.type !== 'leafDirective') continue
    if (!node.name || !mediaDirectives.has(node.name)) continue

    const index = options.components.length
    options.components.push({
      type: node.name,
      props: { ...node.attributes },
      index,
    })

    // Replace directive node with an HTML node containing a comment placeholder
    children[i] = {
      type: 'html',
      value: `<!--component:${index}-->`,
    } as (typeof children)[number]
  }
}
