/* src/lib/liquid-glass.ts */

/* ── Types ──────────────────────────────────────────────────── */
export type BezelType = 'convex_circle' | 'convex_squircle' | 'concave'

export interface LiquidGlassParams {
	/** Element width in CSS pixels. */
	width: number
	/** Element height in CSS pixels. */
	height: number
	/** Corner radius in CSS pixels. */
	radius: number
	/** Width of the refractive bezel zone in CSS pixels. */
	bezelWidth: number
	/** Simulated glass thickness affecting refraction distance. */
	glassThickness: number
	/** Index of refraction (default 1.3, realistic glass). */
	refractiveIndex?: number
	/** Bezel surface curve type (default 'convex_squircle'). */
	bezelType?: BezelType
	/** Specular light angle in radians (default PI/3). */
	specularAngle?: number
	/** Device pixel ratio override (default window.devicePixelRatio). */
	dpr?: number
	/** Supersampling multiplier applied on top of DPR (default 1). */
	supersample?: number
	/** Number of 1D refraction profile samples (default 128). */
	profileSamples?: number
}

export interface LiquidGlassAsset {
	displacementDataUrl: string
	specularDataUrl: string
	/** Maximum raw displacement value, used as feDisplacementMap scale. */
	maxDisplacement: number
}

/* ── Constants ──────────────────────────────────────────────── */

/** Neutral displacement pixel: R=128 G=128 B=0 A=255 (ABGR little-endian). */
const NEUTRAL_DISPLACEMENT_PIXEL = 0xff008080

/** Displacement channel midpoint (128 = no displacement). */
const CHANNEL_MIDPOINT = 128

/** Displacement channel range from midpoint to max (127). */
const CHANNEL_RANGE = 127

/** Delta for numerical derivative approximation. */
const DERIVATIVE_DELTA = 0.0001

/** Specular bezel width in CSS pixels (fixed per kube.io reference). */
const SPECULAR_BEZEL_WIDTH = 50

/* ── Surface equations ──────────────────────────────────────── */

const BEZEL_SURFACE_FNS: Record<BezelType, (normalizedPosition: number) => number> = {
	convex_circle: (t) => Math.sqrt(1 - (1 - t) ** 2),
	convex_squircle: (t) => Math.pow(1 - Math.pow(1 - t, 4), 1 / 4),
	concave: (t) => 1 - Math.sqrt(1 - (1 - t) ** 2),
}

/* ── Rounded-rect bezel geometry ────────────────────────────── */

/**
 * Compute the local coordinate offset from the nearest corner center
 * for a pixel inside a rounded rectangle.
 *
 * Pixels in the straight-edge region return (0, 0).
 * Pixels in the corner arcs return their offset from the arc center.
 */
function cornerOffset(
	pixelX: number,
	pixelY: number,
	bufferWidth: number,
	bufferHeight: number,
	cornerRadius: number,
): { offsetX: number; offsetY: number } {
	const straightWidth = bufferWidth - cornerRadius * 2
	const straightHeight = bufferHeight - cornerRadius * 2

	const offsetX =
		pixelX < cornerRadius
			? pixelX - cornerRadius
			: pixelX >= bufferWidth - cornerRadius
				? pixelX - cornerRadius - straightWidth
				: 0

	const offsetY =
		pixelY < cornerRadius
			? pixelY - cornerRadius
			: pixelY >= bufferHeight - cornerRadius
				? pixelY - cornerRadius - straightHeight
				: 0

	return { offsetX, offsetY }
}

/**
 * Compute anti-aliased opacity for a pixel near the outer edge of the
 * rounded rect, providing a smooth 1px transition at the boundary.
 */
function edgeAntiAliasOpacity(
	distanceFromCornerSq: number,
	radiusSq: number,
	outerRadiusSq: number,
): number {
	if (distanceFromCornerSq < radiusSq) return 1
	return (
		1 -
		(Math.sqrt(distanceFromCornerSq) - Math.sqrt(radiusSq)) /
			(Math.sqrt(outerRadiusSq) - Math.sqrt(radiusSq))
	)
}

/** Create a canvas and return its 2D context + ImageData at the given buffer size. */
function createCanvasBuffer(bufferWidth: number, bufferHeight: number) {
	const canvas = document.createElement('canvas')
	canvas.width = bufferWidth
	canvas.height = bufferHeight
	const ctx = canvas.getContext('2d')!
	const imageData = ctx.createImageData(bufferWidth, bufferHeight)
	return { canvas, ctx, imageData }
}

/* ── Stage 1: 1D refraction profile ─────────────────────────── */

/**
 * Pre-compute lateral displacement for each sample position along the bezel.
 *
 * Uses Snell's law to refract a vertical incident ray through the glass
 * surface defined by `surfaceHeightFn`. Returns displacement in pixels
 * for each of `sampleCount` evenly-spaced positions from the outer edge
 * (index 0) to the inner edge (last index).
 */
function computeRefractionProfile(
	glassThickness: number,
	bezelWidth: number,
	surfaceHeightFn: (normalizedPosition: number) => number,
	refractiveIndex: number,
	sampleCount = 128,
): number[] {
	const inverseIOR = 1 / refractiveIndex

	function refractVerticalRay(
		surfaceNormalX: number,
		surfaceNormalY: number,
	): [number, number] | null {
		const incidentDotNormal = surfaceNormalY
		const discriminant = 1 - inverseIOR ** 2 * (1 - incidentDotNormal ** 2)
		if (discriminant < 0) return null
		const sqrtDiscriminant = Math.sqrt(discriminant)
		return [
			-(inverseIOR * incidentDotNormal + sqrtDiscriminant) * surfaceNormalX,
			inverseIOR - (inverseIOR * incidentDotNormal + sqrtDiscriminant) * surfaceNormalY,
		]
	}

	return Array.from({ length: sampleCount }, (_, sampleIndex) => {
		const normalizedPos = sampleIndex / sampleCount
		const surfaceHeight = surfaceHeightFn(normalizedPos)

		/* Numerical derivative of the surface height function */
		const delta = normalizedPos < 1 ? DERIVATIVE_DELTA : -DERIVATIVE_DELTA
		const neighborHeight = surfaceHeightFn(normalizedPos + delta)
		const slope = (neighborHeight - surfaceHeight) / delta
		const slopeMagnitude = Math.sqrt(slope * slope + 1)

		const surfaceNormal: [number, number] = [-slope / slopeMagnitude, -1 / slopeMagnitude]
		const refractedDirection = refractVerticalRay(surfaceNormal[0], surfaceNormal[1])
		if (!refractedDirection) return 0

		/* Total glass depth at this bezel position */
		const bezelDepth = surfaceHeight * bezelWidth
		const totalDepth = bezelDepth + glassThickness

		/* Lateral displacement = horizontal travel through the remaining glass */
		return refractedDirection[0] * (totalDepth / refractedDirection[1])
	})
}

/* ── Stage 2: 2D displacement map ───────────────────────────── */

/**
 * Rasterize the 1D refraction profile into a 2D displacement map PNG.
 *
 * The output encodes displacement as R/G channels (128 = neutral),
 * suitable for SVG feDisplacementMap consumption.
 */
function rasterizeDisplacementMap(
	cssWidth: number,
	cssHeight: number,
	cornerRadius: number,
	bezelWidth: number,
	maxDisplacement: number,
	refractionProfile: number[],
	devicePixelRatio: number,
): string {
	const bufferWidth = Math.round(cssWidth * devicePixelRatio)
	const bufferHeight = Math.round(cssHeight * devicePixelRatio)
	const { canvas, ctx, imageData } = createCanvasBuffer(bufferWidth, bufferHeight)

	new Uint32Array(imageData.data.buffer).fill(NEUTRAL_DISPLACEMENT_PIXEL)

	const scaledRadius = cornerRadius * devicePixelRatio
	const scaledBezelWidth = bezelWidth * devicePixelRatio
	const radiusSq = scaledRadius ** 2
	const outerRadiusSq = (scaledRadius + 1) ** 2
	const innerRadiusSq = (scaledRadius - scaledBezelWidth) ** 2

	for (let pixelY = 0; pixelY < bufferHeight; pixelY++) {
		for (let pixelX = 0; pixelX < bufferWidth; pixelX++) {
			const { offsetX, offsetY } = cornerOffset(
				pixelX,
				pixelY,
				bufferWidth,
				bufferHeight,
				scaledRadius,
			)
			const distSq = offsetX * offsetX + offsetY * offsetY

			/* Skip pixels outside the bezel zone */
			if (distSq > outerRadiusSq || distSq < innerRadiusSq) continue

			const opacity = edgeAntiAliasOpacity(distSq, radiusSq, outerRadiusSq)
			const distFromCorner = Math.sqrt(distSq)
			const distFromEdge = scaledRadius - distFromCorner
			const directionX = offsetX / distFromCorner
			const directionY = offsetY / distFromCorner

			/* Look up the pre-computed displacement for this bezel depth */
			const profileIndex = ((distFromEdge / scaledBezelWidth) * refractionProfile.length) | 0
			const displacement = refractionProfile[profileIndex] ?? 0
			const normalizedDX = (-directionX * displacement) / maxDisplacement
			const normalizedDY = (-directionY * displacement) / maxDisplacement

			const idx = (pixelY * bufferWidth + pixelX) * 4
			imageData.data[idx] = CHANNEL_MIDPOINT + normalizedDX * CHANNEL_RANGE * opacity
			imageData.data[idx + 1] = CHANNEL_MIDPOINT + normalizedDY * CHANNEL_RANGE * opacity
			imageData.data[idx + 2] = 0
			imageData.data[idx + 3] = 255
		}
	}

	ctx.putImageData(imageData, 0, 0)
	return canvas.toDataURL('image/png')
}

/* ── Specular highlight map ─────────────────────────────────── */

/**
 * Rasterize a directional specular highlight ring at the outer bezel edge.
 *
 * The highlight is a thin (1px) ring whose brightness varies by the dot
 * product of the edge normal with `lightAngle`, using Math.abs so both
 * sides of the glass catch the light.
 */
function rasterizeSpecularMap(
	cssWidth: number,
	cssHeight: number,
	cornerRadius: number,
	bezelWidth: number,
	lightAngle: number,
	devicePixelRatio: number,
): string {
	const bufferWidth = Math.round(cssWidth * devicePixelRatio)
	const bufferHeight = Math.round(cssHeight * devicePixelRatio)
	const { canvas, ctx, imageData } = createCanvasBuffer(bufferWidth, bufferHeight)

	const scaledRadius = cornerRadius * devicePixelRatio
	const scaledBezelWidth = bezelWidth * devicePixelRatio
	const lightDirectionX = Math.cos(lightAngle)
	const lightDirectionY = Math.sin(lightAngle)

	const radiusSq = scaledRadius ** 2
	const outerRadiusSq = (scaledRadius + devicePixelRatio) ** 2
	const innerRadiusSq = (scaledRadius - scaledBezelWidth) ** 2

	for (let pixelY = 0; pixelY < bufferHeight; pixelY++) {
		for (let pixelX = 0; pixelX < bufferWidth; pixelX++) {
			const { offsetX, offsetY } = cornerOffset(
				pixelX,
				pixelY,
				bufferWidth,
				bufferHeight,
				scaledRadius,
			)
			const distSq = offsetX * offsetX + offsetY * offsetY

			if (distSq > outerRadiusSq || distSq < innerRadiusSq) continue

			const distFromCorner = Math.sqrt(distSq)
			const distFromEdge = scaledRadius - distFromCorner
			const opacity = edgeAntiAliasOpacity(distSq, radiusSq, outerRadiusSq)

			/* Edge normal direction (Y flipped for screen coordinates) */
			const normalX = offsetX / distFromCorner
			const normalY = -offsetY / distFromCorner

			/* Specular intensity: directional dot product with circular falloff */
			const lightAlignment = Math.abs(normalX * lightDirectionX + normalY * lightDirectionY)
			const edgeFalloff = Math.sqrt(1 - (1 - distFromEdge / (1 * devicePixelRatio)) ** 2)
			const intensity = lightAlignment * edgeFalloff
			const colorValue = 255 * intensity
			const alphaValue = colorValue * intensity * opacity

			const idx = (pixelY * bufferWidth + pixelX) * 4
			imageData.data[idx] = colorValue
			imageData.data[idx + 1] = colorValue
			imageData.data[idx + 2] = colorValue
			imageData.data[idx + 3] = alphaValue
		}
	}

	ctx.putImageData(imageData, 0, 0)
	return canvas.toDataURL('image/png')
}

/* ── Public API ─────────────────────────────────────────────── */

/** Generate displacement + specular map assets for a liquid glass element. */
export function createLiquidGlassAsset(params: LiquidGlassParams): LiquidGlassAsset {
	const {
		width,
		height,
		radius,
		bezelWidth,
		glassThickness,
		refractiveIndex = 1.3,
		bezelType = 'convex_squircle',
		specularAngle = Math.PI / 3,
		dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
		supersample = 1,
		profileSamples = 128,
	} = params

	const effectiveDpr = dpr * supersample
	const surfaceFn = BEZEL_SURFACE_FNS[bezelType]

	const refractionProfile = computeRefractionProfile(
		glassThickness,
		bezelWidth,
		surfaceFn,
		refractiveIndex,
		profileSamples,
	)
	const maxDisplacement = Math.max(...refractionProfile.map((v) => Math.abs(v)))

	const displacementDataUrl = rasterizeDisplacementMap(
		width,
		height,
		radius,
		bezelWidth,
		maxDisplacement,
		refractionProfile,
		effectiveDpr,
	)

	const specularBezelWidth = Math.min(SPECULAR_BEZEL_WIDTH, radius)
	const specularDataUrl = rasterizeSpecularMap(
		width,
		height,
		radius,
		specularBezelWidth,
		specularAngle,
		effectiveDpr,
	)

	return { displacementDataUrl, specularDataUrl, maxDisplacement }
}

/**
 * Detect whether the browser supports SVG filter references in
 * backdrop-filter (e.g. `backdrop-filter: url(#filterId)`).
 *
 * CSS.supports() cannot reliably distinguish SVG filter refs from
 * simple blur(), so we probe by creating a temporary DOM element
 * with an inline SVG filter and checking whether the computed
 * backdrop-filter retains the url() value.
 *
 * The result is cached after the first call.
 */
let svgBackdropFilterSupported: boolean | null = null

export function supportsSvgBackdropFilter(): boolean {
	if (typeof document === 'undefined') return false
	if (svgBackdropFilterSupported !== null) return svgBackdropFilterSupported

	const ns = 'http://www.w3.org/2000/svg'
	const svg = document.createElementNS(ns, 'svg')
	svg.setAttribute('width', '0')
	svg.setAttribute('height', '0')
	svg.style.position = 'absolute'

	const defs = document.createElementNS(ns, 'defs')
	const filter = document.createElementNS(ns, 'filter')
	filter.setAttribute('id', '__lg_probe')
	const feFlood = document.createElementNS(ns, 'feFlood')
	filter.appendChild(feFlood)
	defs.appendChild(filter)
	svg.appendChild(defs)

	const probe = document.createElement('div')
	probe.style.cssText =
		'position:absolute;width:1px;height:1px;backdrop-filter:url(#__lg_probe);-webkit-backdrop-filter:url(#__lg_probe)'

	document.body.appendChild(svg)
	document.body.appendChild(probe)

	const computed = getComputedStyle(probe)
	/* webkit prefix for Safari fallback */
	const value =
		computed.backdropFilter ||
		(computed as unknown as Record<string, string>).webkitBackdropFilter ||
		''
	svgBackdropFilterSupported = value.includes('url(')

	document.body.removeChild(probe)
	document.body.removeChild(svg)

	return svgBackdropFilterSupported
}
