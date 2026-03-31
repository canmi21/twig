/* src/lib/compiler/rehype-toc.ts */

import type { Root, Element, Text } from 'hast'
import type { Plugin } from 'unified'
import { slugify } from './slugify'

export interface TocEntry {
  depth: number
  text: string
  id: string
}

function extractText(node: Element): string {
  let text = ''
  for (const child of node.children) {
    if (child.type === 'text') {
      text += (child as Text).value
    } else if (child.type === 'element') {
      text += extractText(child as Element)
    }
  }
  return text
}

function createHeadingLink(id: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: `#${id}`,
      className: ['heading-link'],
      ariaLabel: 'Link to section',
      dataHeadingLink: 'true',
      dataHeadingId: id,
    },
    children: [],
  }
}

const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export const rehypeToc: Plugin<[{ toc: TocEntry[] }], Root> =
  (options) => (tree) => {
    for (const node of tree.children) {
      if (node.type !== 'element' || !headingTags.has(node.tagName)) continue

      const depth = Number(node.tagName[1])
      const text = extractText(node)
      const id = slugify(text)

      node.properties = { ...node.properties, id }
      node.children.unshift(createHeadingLink(id))
      options.toc.push({ depth, text, id })
    }
  }
