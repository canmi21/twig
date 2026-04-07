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

    switch (entry.type) {
      case 'image': {
        const url = mediaUrl(opts.cdnPrefix, entry.props.src)
        return `<img src="${url}" alt="${escapeAttr(entry.props.alt ?? '')}" />`
      }
      case 'video':
        return `<video src="${mediaUrl(opts.cdnPrefix, entry.props.src)}" controls></video>`
      case 'audio':
        return `<audio src="${mediaUrl(opts.cdnPrefix, entry.props.src)}" controls></audio>`
      case 'cargo': {
        const crateVer = entry.props.version
          ? `${entry.props.crate}@${entry.props.version}`
          : entry.props.crate
        return `<p><a href="https://crates.io/crates/${entry.props.crate}">${escapeAttr(crateVer)}</a></p>`
      }
      case 'tokei':
        return `<pre><code>${escapeAttr(entry.props.code)}</code></pre>`
      case 'svg-board':
        // Raw SVG breaks Atom XML; fall back to article link
        return opts.articleUrl
          ? `<p><a href="${opts.articleUrl}">View diagram on the website</a></p>`
          : ''
      case 'github': {
        const ghRef = entry.props.ref
        const ghUrl = ghRef
          ? `https://github.com/${escapeAttr(entry.props.repo)}/tree/${escapeAttr(ghRef)}`
          : `https://github.com/${escapeAttr(entry.props.repo)}`
        return `<p><a href="${ghUrl}">${escapeAttr(entry.props.repo)}</a></p>`
      }
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
