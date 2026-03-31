/* src/components/theme-toggle.tsx */

import { useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
}

export function toggleDocumentTheme() {
  const next = document.documentElement.classList.contains('dark')
    ? 'light'
    : 'dark'
  document.documentElement.classList.toggle('dark', next === 'dark')
  document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeToggle({ className }: ThemeToggleProps = {}) {
  const toggle = useCallback(() => {
    toggleDocumentTheme()
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={
        className ??
        `
          absolute top-5 right-5 z-50
          cursor-pointer rounded-full p-2
          text-secondary
          hover:text-primary
          xl:fixed
        `
      }
    >
      <span className="relative block size-4">
        <span
          className="
            absolute inset-0 inline-flex items-center justify-center
            opacity-100 transition-all duration-200
            dark:scale-75 dark:rotate-90 dark:opacity-0
          "
        >
          <Moon size={16} strokeWidth={2.25} />
        </span>
        <span
          className="
            absolute inset-0 inline-flex scale-75 -rotate-90
            items-center justify-center opacity-0 transition-all duration-200
            dark:scale-100 dark:rotate-0 dark:opacity-100
          "
        >
          <Sun size={16} strokeWidth={2.25} />
        </span>
      </span>
    </button>
  )
}
