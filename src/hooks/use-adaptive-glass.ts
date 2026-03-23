/* src/hooks/use-adaptive-glass.ts */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/* ── Types ──────────────────────────────────────────────────── */

export interface AdaptiveGlassOptions {
	/** Range for bgOpacity interpolation [sparse, dense]. */
	bgOpacityRange?: [number, number]
	/** Throttle interval in ms for scroll-based scanning. */
	throttleMs?: number
	/** Number of sample columns across the glass width. */
	sampleCols?: number
	/** Number of sample rows across the glass height. */
	sampleRows?: number
}

export interface AdaptiveGlassResult {
	/** Raw intensity: 0 = sparse/transparent, 1 = dense/frosted. */
	intensity: number
	/** Interpolated background opacity (glass tint). */
	bgOpacity: number
}

/* ── Constants ──────────────────────────────────────────────── */

const DEFAULT_BG_OPACITY_RANGE: [number, number] = [0.15, 0.7]
const DEFAULT_THROTTLE_MS = 100
const DEFAULT_SAMPLE_COLS = 10
const DEFAULT_SAMPLE_ROWS = 10

/** Smoothing factor per frame (~60fps). Lower = slower settle. */
const LERP_FACTOR = 0.08
const LERP_THRESHOLD = 0.001

/** RGB distance threshold for clustering similar colors. */
const COLOR_CLUSTER_THRESHOLD = 30

/** Max distinct color clusters considered for richness scoring. */
const MAX_COLOR_CLUSTERS = 10

/** Non-text score cap: color-based scoring maps to [0, this]. */
const NON_TEXT_SCORE_CAP = 0.5

/** Weight of color richness vs luminance contrast in non-text scoring. */
const COLOR_RICHNESS_WEIGHT = 0.6
const LUMINANCE_CONTRAST_WEIGHT = 0.4

/* ── Scoring helpers ────────────────────────────────────────── */

const DENSE_TAGS = new Set(['PRE', 'CODE', 'TABLE', 'TBODY', 'THEAD'])
const MEDIA_TAGS = new Set(['IMG', 'VIDEO', 'CANVAS', 'SVG', 'PICTURE'])

type RGB = [number, number, number]

interface SampleResult {
	isText: boolean
	/** Text score (0..1) or -1 if non-text. */
	textScore: number
	/** Background color for non-text samples. */
	color: RGB | null
}

/** Parse rgb/rgba CSS string to [r, g, b]. */
function parseRgb(color: string): RGB | null {
	const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color)
	if (!m) {
		return null
	}
	return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Euclidean distance between two RGB colors. */
function rgbDistance(a: RGB, b: RGB): number {
	const dr = a[0] - b[0]
	const dg = a[1] - b[1]
	const db = a[2] - b[2]
	return Math.sqrt(dr * dr + dg * dg + db * db)
}

/** Relative luminance (0..255). */
function luminance(rgb: RGB): number {
	return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
}

/**
 * Cluster colors by distance threshold.
 * Returns the number of distinct clusters (capped at MAX_COLOR_CLUSTERS).
 */
function countColorClusters(colors: RGB[]): number {
	if (colors.length === 0) {
		return 0
	}
	const centroids: RGB[] = [colors[0]]

	for (let i = 1; i < colors.length; i++) {
		const color = colors[i]
		let matched = false
		for (const centroid of centroids) {
			if (rgbDistance(color, centroid) < COLOR_CLUSTER_THRESHOLD) {
				matched = true
				break
			}
		}
		if (!matched) {
			centroids.push(color)
			if (centroids.length >= MAX_COLOR_CLUSTERS) {
				break
			}
		}
	}

	return centroids.length
}

/**
 * Score non-text samples using two dimensions:
 * 1. Color richness: distinct cluster count / MAX_COLOR_CLUSTERS (0..1)
 * 2. Luminance contrast: (maxLum - minLum) / 255 (0..1)
 *
 * Combined with weights, capped at NON_TEXT_SCORE_CAP.
 */
function scoreNonTextColors(colors: RGB[]): number {
	if (colors.length === 0) {
		return 0
	}

	/* Dimension 1: color richness via clustering */
	const clusters = countColorClusters(colors)
	const richness = Math.min(1, clusters / MAX_COLOR_CLUSTERS)

	/* Dimension 2: luminance contrast */
	let minLum = 255
	let maxLum = 0
	for (const c of colors) {
		const lum = luminance(c)
		if (lum < minLum) {
			minLum = lum
		}
		if (lum > maxLum) {
			maxLum = lum
		}
	}
	const contrast = (maxLum - minLum) / 255

	const raw = richness * COLOR_RICHNESS_WEIGHT + contrast * LUMINANCE_CONTRAST_WEIGHT
	return raw * NON_TEXT_SCORE_CAP
}

/** Ratio threshold: if element width > glass width * this, treat as container. */
const CONTAINER_WIDTH_RATIO = 2

/**
 * Score a single sampled element relative to the glass size.
 */
function sampleElement(el: Element, glassHeight: number, glassWidth: number): SampleResult {
	/* Priority 1: declarative hint */
	const hintEl = el.closest('[data-glass-hint]')
	if (hintEl) {
		const hint = hintEl.getAttribute('data-glass-hint')
		if (hint === 'dense') {
			return { isText: true, textScore: 1, color: null }
		}
		if (hint === 'sparse') {
			return { isText: false, textScore: -1, color: parseRgb(getComputedStyle(el).backgroundColor) }
		}
	}

	/* Priority 2: page-level containers (wider than glass * 2, or transparent bg + wider) → empty background */
	const elWidth = (el as HTMLElement).offsetWidth
	if (elWidth > 0 && elWidth > glassWidth * CONTAINER_WIDTH_RATIO) {
		return { isText: false, textScore: -1, color: parseRgb(getComputedStyle(el).backgroundColor) }
	}

	/* Priority 3: code/table → always dense text */
	if (DENSE_TAGS.has(el.tagName)) {
		return { isText: true, textScore: 1, color: null }
	}

	/* Priority 4: media → non-text */
	if (MEDIA_TAGS.has(el.tagName)) {
		return { isText: false, textScore: -1, color: parseRgb(getComputedStyle(el).backgroundColor) }
	}

	/* Priority 5: no text content → non-text */
	const text = el.textContent ? el.textContent.trim() : ''
	if (text.length === 0) {
		return { isText: false, textScore: -1, color: parseRgb(getComputedStyle(el).backgroundColor) }
	}

	/* Priority 6: text — font size relative to glass height */
	const fontSize = Number.parseFloat(getComputedStyle(el).fontSize)
	const ratio = fontSize / Math.max(1, glassHeight)
	const score = ratio >= 1 ? 0 : 1 - ratio
	return { isText: true, textScore: score, color: null }
}

/* ── Scanning ───────────────────────────────────────────────── */

/**
 * Scan elements behind the glass panel at a dense grid of sample points.
 *
 * Text samples: scored by fontSize/glassHeight ratio (0..1).
 * Non-text samples: scored by color richness + luminance contrast (0..0.5).
 * Mixed: weighted average by sample count.
 */
function scanIntensity(glassEl: HTMLElement, sampleCols: number, sampleRows: number): number {
	const rect = glassEl.getBoundingClientRect()
	if (rect.width < 1 || rect.height < 1) {
		return 0
	}

	const glassHeight = rect.height
	const glassWidth = rect.width
	const textScores: number[] = []
	const nonTextColors: RGB[] = []

	for (let row = 0; row < sampleRows; row++) {
		for (let col = 0; col < sampleCols; col++) {
			const x = rect.left + ((col + 0.5) / sampleCols) * rect.width
			const y = rect.top + ((row + 0.5) / sampleRows) * rect.height

			const stack = document.elementsFromPoint(x, y)

			for (const el of stack) {
				if (glassEl.contains(el) || el.contains(glassEl)) {
					continue
				}

				const result = sampleElement(el, glassHeight, glassWidth)

				if (result.isText) {
					textScores.push(result.textScore)
				} else if (result.color) {
					nonTextColors.push(result.color)
				}
				break
			}
		}
	}

	/* Text dominates when present */
	if (textScores.length > 0) {
		const avgText = textScores.reduce((a, b) => a + b, 0) / textScores.length

		if (nonTextColors.length > 0) {
			const colorScore = scoreNonTextColors(nonTextColors)
			const textWeight = textScores.length / (textScores.length + nonTextColors.length)
			return avgText * textWeight + colorScore * (1 - textWeight)
		}
		return avgText
	}

	/* All non-text: color-based scoring */
	return scoreNonTextColors(nonTextColors)
}

/* ── Hook ───────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t
}

export function useAdaptiveGlass(
	ref: RefObject<HTMLElement | null>,
	options: AdaptiveGlassOptions = {},
): AdaptiveGlassResult {
	const bgOpacityRange = options.bgOpacityRange ?? DEFAULT_BG_OPACITY_RANGE
	const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS
	const sampleCols = options.sampleCols ?? DEFAULT_SAMPLE_COLS
	const sampleRows = options.sampleRows ?? DEFAULT_SAMPLE_ROWS

	const [smoothIntensity, setSmoothIntensity] = useState(0)
	const targetRef = useRef(0)
	const currentRef = useRef(0)

	/* Scroll-triggered scan */
	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		let lastRun = 0

		function scan() {
			const el = ref.current
			if (!el) {
				return
			}
			targetRef.current = scanIntensity(el, sampleCols, sampleRows)
		}

		function onScroll() {
			const now = performance.now()
			if (now - lastRun < throttleMs) {
				return
			}
			lastRun = now
			scan()
		}

		/* Initial scan */
		scan()

		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [ref, throttleMs, sampleCols, sampleRows])

	/* RAF smoothing loop */
	useLayoutEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		let frameId: number

		function tick() {
			const current = currentRef.current
			const target = targetRef.current
			const next = current + (target - current) * LERP_FACTOR

			let updated = false
			if (Math.abs(next - target) < LERP_THRESHOLD) {
				if (current !== target) {
					currentRef.current = target
					setSmoothIntensity(target)
					updated = true
				}
			} else {
				currentRef.current = next
				setSmoothIntensity(next)
				updated = true
			}

			/* Sync CSS variable for child elements to consume */
			if (updated) {
				const el = ref.current
				if (el) {
					el.style.setProperty('--glass-intensity', String(currentRef.current.toFixed(3)))
				}
			}

			frameId = requestAnimationFrame(tick)
		}

		frameId = requestAnimationFrame(tick)
		return () => cancelAnimationFrame(frameId)
	}, [ref])

	return {
		intensity: smoothIntensity,
		bgOpacity: lerp(bgOpacityRange[0], bgOpacityRange[1], smoothIntensity),
	}
}
