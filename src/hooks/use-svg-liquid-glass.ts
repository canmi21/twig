/* src/hooks/use-svg-liquid-glass.ts */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createLiquidGlassAsset, isChromium } from '~/lib/liquid-glass'
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
}

function createFilterId(): string {
	return `liquid-glass-${Math.random().toString(36).slice(2, 10)}`
}

export function useSvgLiquidGlass(
	ref: RefObject<HTMLElement | null>,
	options: SvgLiquidGlassOptions = {},
): UseSvgLiquidGlassResult {
	const filterIdRef = useRef(createFilterId())
	const [size, setSize] = useState({ width: 0, height: 0 })

	useEffect(() => {
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

	const chromium = isChromium()

	const asset = useMemo(() => {
		if (!chromium || size.width < 2 || size.height < 2) return null

		return createLiquidGlassAsset({
			width: size.width,
			height: size.height,
			radius: options.radius ?? Math.round(size.height / 2),
			bezelWidth: options.bezelWidth ?? 29,
			glassThickness: options.glassThickness ?? 90,
			refractiveIndex: options.refractiveIndex ?? 1.3,
			bezelType: options.bezelType ?? 'convex_squircle',
			specularAngle: options.specularAngle,
		})
	}, [
		chromium,
		size.width,
		size.height,
		options.radius,
		options.bezelWidth,
		options.glassThickness,
		options.refractiveIndex,
		options.bezelType,
		options.specularAngle,
	])

	return {
		active: chromium && !!asset,
		filterId: filterIdRef.current,
		displacementMap: asset?.displacementDataUrl ?? null,
		specularMap: asset?.specularDataUrl ?? null,
		blur: options.blur ?? 1,
		scale: (asset?.maxDisplacement ?? 0) * Math.max(0, Math.min(1, options.scaleRatio ?? 1)),
		saturation: options.specularSaturation ?? 6,
		specularOpacity: options.specularOpacity ?? 0.4,
		width: size.width,
		height: size.height,
	}
}
