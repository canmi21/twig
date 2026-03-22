/* src/hooks/use-svg-liquid-glass.ts */

import { useId, useLayoutEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { createLiquidGlassAsset, supportsSvgBackdropFilter } from '~/lib/liquid-glass'
import type { BezelType } from '~/lib/liquid-glass'
import type { ResolvedTheme } from '~/lib/theme'

export type { BezelType }

export interface SvgLiquidGlassOptions {
	radius?: number
	bezelWidth?: number
	glassThickness?: number
	refractiveIndex?: number
	bezelType?: BezelType
	specularAngle?: number
	blur?: number
	scaleRatio?: number
	specularOpacity?: number
	specularSaturation?: number
	supersample?: number
	profileSamples?: number
	theme?: ResolvedTheme
}

export interface UseSvgLiquidGlassResult {
	active: boolean
	filterId: string
	displacementMap: string | null
	specularMap: string | null
	blur: number
	scale: number
	saturation: number
	specularOpacity: number
	width: number
	height: number
	/** Device pixel ratio used for rendering, useful for filterRes. */
	dpr: number
	/** CSS backdrop-filter value: url(#filterId) when active, undefined when not. */
	svgFilter: string | undefined
	/** CSS blur value for the blur layer: larger fallback before active, refined after. */
	cssBlur: string
	/** CSS filter for the blur layer: simulates colorMatrix brightness before glass is ready. */
	cssFilter: string | undefined
	/** CSS box-shadow for simulated specular edge highlight (always present). */
	edgeHighlight: string
	/** CSS transition for the blur layer fade. */
	blurTransition: string
	/** CSS animation class for the SVG filter layer fade-in. */
	fadeInAnimation: string
}

export function useSvgLiquidGlass(
	ref: RefObject<HTMLElement | null>,
	options: SvgLiquidGlassOptions = {},
): UseSvgLiquidGlassResult {
	const reactId = useId()
	const filterId = `liquid-glass-${reactId.replaceAll(':', '')}`
	const [size, setSize] = useState({ width: 0, height: 0 })

	useLayoutEffect(() => {
		const element = ref.current
		if (!element) return

		const updateSize = () => {
			const nextWidth = Math.max(1, Math.round(element.offsetWidth))
			const nextHeight = Math.max(1, Math.round(element.offsetHeight))
			setSize((current) =>
				current.width === nextWidth && current.height === nextHeight
					? current
					: { width: nextWidth, height: nextHeight },
			)
		}

		updateSize()

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updateSize, { passive: true })
			return () => window.removeEventListener('resize', updateSize)
		}

		const observer = new ResizeObserver(() => updateSize())
		observer.observe(element)
		return () => observer.disconnect()
	}, [ref])

	const supported = supportsSvgBackdropFilter()

	const asset = useMemo(() => {
		if (!supported || size.width < 2 || size.height < 2) return null

		return createLiquidGlassAsset({
			width: size.width,
			height: size.height,
			radius: options.radius ?? Math.round(size.height / 2),
			bezelWidth: options.bezelWidth ?? 29,
			glassThickness: options.glassThickness ?? 90,
			refractiveIndex: options.refractiveIndex ?? 1.3,
			bezelType: options.bezelType ?? 'convex_squircle',
			specularAngle: options.specularAngle,
			supersample: options.supersample ?? 1,
			profileSamples: options.profileSamples ?? 64,
		})
	}, [
		supported,
		size.width,
		size.height,
		options.radius,
		options.bezelWidth,
		options.glassThickness,
		options.refractiveIndex,
		options.bezelType,
		options.specularAngle,
		options.supersample,
		options.profileSamples,
	])

	const isActive = supported && Boolean(asset)

	return {
		active: isActive,
		filterId,
		displacementMap: asset?.displacementDataUrl ?? null,
		specularMap: asset?.specularDataUrl ?? null,
		blur: options.blur ?? 0,
		scale: (asset?.maxDisplacement ?? 0) * Math.max(0, Math.min(1, options.scaleRatio ?? 1)),
		saturation: options.specularSaturation ?? 6,
		specularOpacity: options.specularOpacity ?? 0.4,
		width: size.width,
		height: size.height,
		dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
		svgFilter: isActive ? `url(#${filterId})` : undefined,
		cssBlur: isActive ? 'blur(0.5px)' : 'saturate(1.2) blur(12px) brightness(0.95)',
		cssFilter: undefined,
		edgeHighlight:
			'inset 0 0 0 0.5px rgba(255,255,255,0.15), inset 0 0.5px 0 0.5px rgba(255,255,255,0.1)',
		blurTransition: 'backdrop-filter 300ms ease-out, -webkit-backdrop-filter 300ms ease-out',
		fadeInAnimation: 'fadeIn 300ms ease-out both',
	}
}
