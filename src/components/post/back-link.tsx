/* src/components/post/back-link.tsx */

import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Undo2 } from 'lucide-react'

export function PostBackLink() {
  return (
    <Link
      to="/posts"
      aria-label="Back to posts"
      className="
        absolute top-5 left-5 z-50
        inline-flex items-center justify-center
        rounded-full p-2
        text-primary opacity-(--opacity-subtle)
        transition-[color,opacity] duration-[140ms]
        hover:opacity-100
        xl:fixed
        xl:top-28 xl:left-[max(1.5rem,calc((100vw-45rem)/4-5.5rem))]
        xl:justify-start xl:gap-1.5
        xl:rounded-none xl:p-0
      "
    >
      <motion.span
        className="inline-flex"
        whileHover={{ x: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <Undo2 className="size-4" strokeWidth={2.25} />
      </motion.span>
      <span className="hidden text-[13px] leading-none xl:inline">Back</span>
    </Link>
  )
}
