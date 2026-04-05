/* src/lib/compiler/render-static-html.ts */

import type { ComponentEntry } from './index'
import { mediaUrl } from '~/lib/storage/media-url'

/**
 * Resolve component placeholders in compiled HTML to plain HTML tags.
 * Strips interactive heading links (anchor + SVG icon) that are
 * meaningless outside the website. No React dependency.
 */
export function renderStaticHtml(
  html: string,
  components: ComponentEntry[],
  opts: { cdnPrefix: string; articleUrl?: string },
): string {
  let result = stripHeadingLinks(html)

  if (components.length === 0) return result

  return result.replace(/<!--component:(\d+)-->/g, (_, indexStr: string) => {
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
      case 'svg-board':
        return `<div class="post-media post-media--svg-board">${entry.props.code}</div>`
      default:
        return opts.articleUrl
          ? `<p><a href="${opts.articleUrl}">View interactive content on the website</a></p>`
          : ''
    }
  })
}

/** Remove `<a data-heading-link="true">...<svg>...</svg></a>` from headings. */
function stripHeadingLinks(html: string): string {
  return html.replaceAll(
    /<a\s[^>]*data-heading-link="true"[^>]*>[\s\S]*?<\/a>/g,
    '',
  )
}

function escapeAttr(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
