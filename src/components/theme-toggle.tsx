/* src/components/theme-toggle.tsx */

import { useState, useCallback, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

const subscribe = () => () => {}
const isMounted = () => true
const isNotMounted = () => false

function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, isMounted, isNotMounted)
}

export function ThemeToggle() {
  const hydrated = useHydrated()
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  )

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`
      return next
    })
  }, [])

  if (!hydrated) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      className="
        absolute top-5 right-5 z-50
        cursor-pointer rounded-full p-2
        text-secondary
        hover:text-primary
        xl:fixed
      "
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
