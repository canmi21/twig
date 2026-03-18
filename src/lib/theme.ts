/* src/lib/theme.ts */

import { useSyncExternalStore } from 'react'

export type ResolvedTheme = 'light' | 'dark'
export type ThemePreference = ResolvedTheme

const THEME_COOKIE_KEY = 'theme'
const THEME_MAX_AGE = 60 * 60 * 24 * 400

export function setThemeCookie(preference: ThemePreference) {
	document.cookie = `${THEME_COOKIE_KEY}=${preference};path=/;max-age=${THEME_MAX_AGE};samesite=lax`
}

function getSystemTheme(): ResolvedTheme {
	return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'
}

function resolveTheme(preference?: ThemePreference | null): ResolvedTheme {
	return preference ?? getSystemTheme()
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
	document.documentElement.classList.toggle('dark', resolved === 'dark')
	document.documentElement.style.colorScheme = resolved
	notifyThemeChange()
}

/**
 * Wrap theme application in View Transition API and let CSS own the wipe motion.
 * Falls back to instant swap when the API is unavailable.
 */
export function applyResolvedThemeWithTransition(resolved: ResolvedTheme) {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not all browsers implement View Transition API
	if (!document.startViewTransition) {
		applyResolvedTheme(resolveTheme(resolved))
		return
	}

	void document.startViewTransition(() => {
		applyResolvedTheme(resolveTheme(resolved))
	})
}

// --- reactive theme hook ---
// Subscribes to .dark class mutations on <html> so all consumers stay in sync.
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
	listeners.add(cb)
	return () => listeners.delete(cb)
}

function getSnapshot(): ThemePreference {
	if (typeof document === 'undefined') {
		return 'light'
	}
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function getServerSnapshot(): ThemePreference {
	return 'light'
}

// notify listeners whenever theme changes (called from applyResolvedTheme)
function notifyThemeChange() {
	for (const cb of listeners) {
		cb()
	}
}

/** Reactive hook that returns the current theme and stays in sync across all toggle sources. */
export function useTheme(): ThemePreference {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Blocking script injected into <head> to prevent FOUC.
 *
 * Resolve chain:
 *   cookie = light | dark -> apply directly
 *   cookie absent -> resolve from system once, persist resolved value, then apply
 */
export const THEME_INIT_SCRIPT = [
	'(function(){',
	String.raw`var m=document.cookie.match(/\btheme=(light|dark)\b/);`,
	'var t=m?m[1]:window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";',
	'if(t==="dark")document.documentElement.classList.add("dark");',
	'document.documentElement.style.colorScheme=t;',
	'if(!m)document.cookie="theme="+t+";path=/;max-age=34560000;samesite=lax";',
	'})()',
].join('')
