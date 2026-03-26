/* src/lib/content/render-html.ts */

import type { ComponentEntry } from '~/lib/compiler/index'
import { mediaUrl } from '~/lib/storage/media-url'

/**
 * Resolve component placeholders in compiled HTML to plain HTML tags.
 * No React dependency — pure string operations for feeds and other
 * non-interactive contexts.
 */
export function renderStaticHtml(
  html: string,
  components: ComponentEntry[],
  opts: { cdnPrefix: string; articleUrl?: string },
): string {
  if (components.length === 0) return html

  return html.replace(/<!--component:(\d+)-->/g, (_, indexStr: string) => {
    const entry = components[Number(indexStr)]
    if (!entry) return ''

    const url = mediaUrl(opts.cdnPrefix, entry.props.src)

    switch (entry.type) {
      case 'image':
        return `<img src="${url}" alt="${escapeAttr(entry.props.alt ?? '')}" />`
      case 'video':
        return `<video src="${url}" controls></video>`
      case 'audio':
        return `<audio src="${url}" controls></audio>`
      default:
        return opts.articleUrl
          ? `<p><a href="${opts.articleUrl}">View interactive content</a></p>`
          : ''
    }
  })
}

function escapeAttr(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
