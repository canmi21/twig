/* src/components/post/use-fit-bubble.ts */

import { useLayoutEffect, useRef } from 'react'
import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext'

/**
 * Font string must exactly mirror CSS:
 *   text-[13.5px] + root font-family from tailwind.css
 * If the site font stack changes, update this constant.
 */
const BUBBLE_FONT =
  '13.5px "Noto Sans", "Noto Sans SC", "Noto Sans JP", system-ui, -apple-system, sans-serif'

/** px-3 (12px * 2) + border (1px * 2) = 26px total horizontal chrome */
const BUBBLE_PAD = 26

/**
 * Measure text layout via pretext (canvas, no DOM reflow) and set
 * the tightest width that still fits every wrapped line.
 *
 * Attach `ref` to the bubble div. useLayoutEffect measures and
 * mutates width directly on the element before the browser paints,
 * so there is zero flicker — especially with the existing fade-in.
 */
export function useFitBubble(text: string): {
  ref: React.RefObject<HTMLDivElement | null>
} {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const maxTextWidth = parent.clientWidth - BUBBLE_PAD
    if (maxTextWidth <= 0) return

    const prepared = prepareWithSegments(text, BUBBLE_FONT)
    let widest = 0
    walkLineRanges(prepared, maxTextWidth, (line) => {
      if (line.width > widest) widest = line.width
    })

    // Shrink only when text actually wraps and the widest line
    // is meaningfully narrower than the available space.
    if (widest > 0 && widest < maxTextWidth - 1) {
      el.style.width = `${Math.ceil(widest) + BUBBLE_PAD}px`
    } else {
      el.style.width = ''
    }
  }, [text])

  return { ref }
}
