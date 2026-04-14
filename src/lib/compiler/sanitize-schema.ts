/* src/lib/compiler/sanitize-schema.ts */

import { defaultSchema } from 'rehype-sanitize'

type Schema = typeof defaultSchema

// Why a custom schema ------------------------------------------------------
//
// rehype-sanitize's defaultSchema is modeled on GitHub's post-sanitize
// allowlist. Out of the box it is safe but breaks three things this
// compiler depends on:
//
//   1. Shiki syntax highlighting emits inline `style` attributes and
//      arbitrary token `class` values on <pre>, <code>, and <span>. The
//      default schema restricts classNames on these elements to
//      `language-*` and `math-*` and forbids style entirely, so code
//      blocks would render as unstyled plain text.
//
//   2. rehype-toc adds a `.heading-link` anchor with custom data-*
//      attributes to every heading. The default `a` allowlist does not
//      include className or data attributes, so those get stripped and
//      the anchor loses its hover target.
//
//   3. hast-util-sanitize's "clobber" feature rewrites `id` and `name`
//      on user content with a `user-content-` prefix. That is a sane
//      default for arbitrary UGC but here it breaks in-page anchor
//      links (`#getting-started` no longer points at an element with
//      that id).
//
// Everything else stays at GitHub defaults. Arbitrary user-authored
// HTML (<script>, <iframe>, inline event handlers, javascript: URLs,
// form controls, etc.) is still rejected. The compiler accepts raw
// HTML upstream via allowDangerousHtml + rehype-raw, so this schema is
// the single line of defense — additions should be deliberate.

const defaultAttrs = defaultSchema.attributes ?? {}

function mergeAttrs(
  tag: string,
  extras: Array<string | [string, ...Array<string | number>]>,
): Array<string | [string, ...Array<string | number>]> {
  // defaultAttrs entries are either plain strings or tuples. Replace
  // any existing className/style entry so our unrestricted version
  // wins over the default value allowlist.
  const existing = (defaultAttrs[tag] ?? []).filter((item) => {
    const name = Array.isArray(item) ? item[0] : item
    return name !== 'className' && name !== 'style'
  })
  return [...existing, ...extras]
}

const codeAttrs = mergeAttrs('code', ['className', 'style'])
const preAttrs = mergeAttrs('pre', ['className', 'style', 'tabIndex'])
const spanAttrs = mergeAttrs('span', ['className', 'style'])
const divAttrs = mergeAttrs('div', ['className', 'style'])

/** Heading anchors created by rehype-toc carry a className, an aria
 *  label, and two data-* attributes used by the client-side TOC. */
const anchorAttrs = mergeAttrs('a', [
  'className',
  'ariaLabel',
  'dataHeadingLink',
  'dataHeadingId',
])

export const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultAttrs,
    a: anchorAttrs,
    code: codeAttrs,
    pre: preAttrs,
    span: spanAttrs,
    div: divAttrs,
  },
  // Disable the user-content- prefix clobber so in-page anchors keep
  // working. We still restrict which tags can carry an `id` via the
  // per-tag attribute allowlist above.
  clobberPrefix: '',
  clobber: [],
  // Preserve `<!--component:N-->` placeholders injected by
  // remark-extract-directives. Without this the compiler's output loses
  // every image, video, linkcard, svg-board, and tokei block.
  allowComments: true,
}
