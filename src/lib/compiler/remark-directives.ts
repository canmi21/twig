/* src/lib/compiler/remark-directives.ts */

import type { Root as MdastRoot, Code } from 'mdast'
import type { Plugin } from 'unified'

export interface ComponentEntry {
  type: string
  props: Record<string, string>
  index: number
}

const mediaDirectives = new Set([
  'image',
  'video',
  'audio',
  'linkcard',
  'github',
  'cargo',
])

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

    // Extract media directives (::image, ::video, ::audio, ::linkcard)
    if (node.type === 'leafDirective') {
      if (!node.name || !mediaDirectives.has(node.name)) continue

      const index = options.components.length
      options.components.push({
        type: node.name,
        props: { ...node.attributes },
        index,
      })

      children[i] = {
        type: 'html',
        value: `<!--component:${index}-->`,
      } as (typeof children)[number]
      continue
    }

    // Extract fenced code blocks (```svg-board, ```tokei)
    const codeLang = node.type === 'code' ? (node as Code).lang : undefined
    if (codeLang === 'svg-board' || codeLang === 'tokei') {
      const meta = (node as Code).meta ?? ''
      const metaProps: Record<string, string> = {}
      for (const m of meta.matchAll(/(\w+)(?:="([^"]*)")?/g)) {
        metaProps[m[1]] = m[2] ?? 'true'
      }

      const index = options.components.length
      options.components.push({
        type: codeLang,
        props: { code: (node as Code).value, ...metaProps },
        index,
      })

      children[i] = {
        type: 'html',
        value: `<!--component:${index}-->`,
      } as (typeof children)[number]
    }
  }
}
