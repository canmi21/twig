/* src/components/editor/plugins/ime-mark-protection.ts */

/* src/components/editor/plugins/ime-mark-protection.ts
 *
 * ProseMirror creates a cursor wrapper when compositionstart fires with
 * storedMarks. Some IMEs (Chinese pinyin) restructure the DOM around this
 * wrapper, causing ProseMirror to apply the mark to the entire paragraph.
 * Workaround: intercept compositionstart, save storedMarks, clear them to
 * prevent cursor wrapper creation, then reapply marks to the composed text.
 */

import { $prose } from '@milkdown/kit/utils'
import { Plugin } from '@milkdown/kit/prose/state'
import type { Mark } from '@milkdown/kit/prose/model'

let imePendingMarks: readonly Mark[] | null = null
let imeStartPos: number | null = null

export const imeMarkProtectionPlugin = $prose(
  () =>
    new Plugin({
      props: {
        handleDOMEvents: {
          compositionstart(view) {
            const { storedMarks } = view.state
            if (storedMarks && storedMarks.length > 0) {
              imePendingMarks = storedMarks
              imeStartPos = view.state.selection.from
              view.dispatch(view.state.tr.setStoredMarks(null))
            }
            return false
          },
          compositionend(view) {
            if (!imePendingMarks || imeStartPos === null) return false
            const marks = imePendingMarks
            const from = imeStartPos
            imePendingMarks = null
            imeStartPos = null
            // Wait for ProseMirror to commit the composed text, then apply marks.
            // ProseMirror flushes on microtask + schedules endComposition at 20ms.
            requestAnimationFrame(() => {
              const to = view.state.selection.from
              if (to > from) {
                const tr = view.state.tr
                for (const mark of marks) tr.addMark(from, to, mark)
                // Re-set storedMarks so next input stays marked
                tr.setStoredMarks(marks)
                view.dispatch(tr)
              }
            })
            return false
          },
        },
      },
    }),
)
