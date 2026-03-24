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

function createHeadingLinkIcon(): Element {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
      className: ['heading-link-icon'],
    },
    children: [
      {
        type: 'element',
        tagName: 'path',
        properties: {
          d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
        },
        children: [],
      },
      {
        type: 'element',
        tagName: 'path',
        properties: {
          d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
        },
        children: [],
      },
    ],
  }
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
    children: [createHeadingLinkIcon()],
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
