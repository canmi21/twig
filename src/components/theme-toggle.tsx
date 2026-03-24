/* src/components/theme-toggle.tsx */

import { useState, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme)

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`
  }, [theme])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      className="
        fixed top-4 right-4 z-50
        cursor-pointer rounded-full p-2
        text-on-surface
        transition-colors
        hover:bg-black/5
        dark:hover:bg-white/10
      "
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
