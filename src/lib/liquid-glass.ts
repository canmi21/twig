/* src/lib/liquid-glass.ts */

export type BezelType = 'convex_circle' | 'convex_squircle' | 'concave'

export interface LiquidGlassParams {
	width: number
	height: number
	radius: number
	bezelWidth: number
	glassThickness: number
	refractiveIndex?: number
	bezelType?: BezelType
	specularAngle?: number
	dpr?: number
}

export interface LiquidGlassAsset {
	displacementDataUrl: string
	specularDataUrl: string
	maxDisplacement: number
}

/* ── Surface equations ──────────────────────────────────────── */

const SURFACE_FNS: Record<BezelType, (x: number) => number> = {
	convex_circle: (x) => Math.sqrt(1 - (1 - x) ** 2),
	convex_squircle: (x) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4),
	concave: (x) => 1 - Math.sqrt(1 - (1 - x) ** 2),
}

/* ── Stage 1: 1D displacement profile ──────────────────────── */

function calculateDisplacementProfile(
	glassThickness: number,
	bezelWidth: number,
	bezelHeightFn: (x: number) => number,
	refractiveIndex: number,
	samples = 128,
): number[] {
	const eta = 1 / refractiveIndex

	function refract(normalX: number, normalY: number): [number, number] | null {
		const dot = normalY
		const k = 1 - eta * eta * (1 - dot * dot)
		if (k < 0) return null
		const kSqrt = Math.sqrt(k)
		return [-(eta * dot + kSqrt) * normalX, eta - (eta * dot + kSqrt) * normalY]
	}

	return Array.from({ length: samples }, (_, i) => {
		const x = i / samples
		const y = bezelHeightFn(x)
		const dx = x < 1 ? 0.0001 : -0.0001
		const y2 = bezelHeightFn(x + dx)
		const derivative = (y2 - y) / dx
		const magnitude = Math.sqrt(derivative * derivative + 1)
		const normal: [number, number] = [-derivative / magnitude, -1 / magnitude]
		const refracted = refract(normal[0], normal[1])

		if (!refracted) return 0
		const remainingHeightOnBezel = y * bezelWidth
		const remainingHeight = remainingHeightOnBezel + glassThickness
		return refracted[0] * (remainingHeight / refracted[1])
	})
}

/* ── Stage 2: 2D displacement map rasterization ────────────── */

function rasterizeDisplacementMap(
	width: number,
	height: number,
	radius: number,
	bezelWidth: number,
	maximumDisplacement: number,
	profile: number[],
	dpr: number,
): string {
	const bw = Math.round(width * dpr)
	const bh = Math.round(height * dpr)
	const canvas = document.createElement('canvas')
	canvas.width = bw
	canvas.height = bh
	const ctx = canvas.getContext('2d')!
	const imageData = ctx.createImageData(bw, bh)

	new Uint32Array(imageData.data.buffer).fill(0xff008080)

	const r = radius * dpr
	const bz = bezelWidth * dpr
	const rSq = r ** 2
	const rPlusOneSq = (r + 1) ** 2
	const rMinusBzSq = (r - bz) ** 2
	const objW = bw
	const objH = bh
	const wBetween = objW - r * 2
	const hBetween = objH - r * 2

	for (let y1 = 0; y1 < objH; y1++) {
		for (let x1 = 0; x1 < objW; x1++) {
			const idx = (y1 * bw + x1) * 4

			const isLeft = x1 < r
			const isRight = x1 >= objW - r
			const isTop = y1 < r
			const isBottom = y1 >= objH - r

			const x = isLeft ? x1 - r : isRight ? x1 - r - wBetween : 0
			const y = isTop ? y1 - r : isBottom ? y1 - r - hBetween : 0

			const dSq = x * x + y * y
			if (dSq > rPlusOneSq || dSq < rMinusBzSq) continue

			const opacity =
				dSq < rSq
					? 1
					: 1 - (Math.sqrt(dSq) - Math.sqrt(rSq)) / (Math.sqrt(rPlusOneSq) - Math.sqrt(rSq))

			const dist = Math.sqrt(dSq)
			const fromSide = r - dist
			const cos = x / dist
			const sin = y / dist

			const bezelIdx = ((fromSide / bz) * profile.length) | 0
			const displacement = profile[bezelIdx] ?? 0

			const dX = (-cos * displacement) / maximumDisplacement
			const dY = (-sin * displacement) / maximumDisplacement

			imageData.data[idx] = 128 + dX * 127 * opacity
			imageData.data[idx + 1] = 128 + dY * 127 * opacity
			imageData.data[idx + 2] = 0
			imageData.data[idx + 3] = 255
		}
	}

	ctx.putImageData(imageData, 0, 0)
	return canvas.toDataURL('image/png')
}

/* ── Specular highlight map ─────────────────────────────────── */

function rasterizeSpecularMap(
	width: number,
	height: number,
	radius: number,
	bezelWidth: number,
	specularAngle: number,
	dpr: number,
): string {
	const bw = Math.round(width * dpr)
	const bh = Math.round(height * dpr)
	const canvas = document.createElement('canvas')
	canvas.width = bw
	canvas.height = bh
	const ctx = canvas.getContext('2d')!
	const imageData = ctx.createImageData(bw, bh)

	const r = radius * dpr
	const bz = bezelWidth * dpr
	const specVec = [Math.cos(specularAngle), Math.sin(specularAngle)]

	const rSq = r ** 2
	const rPlusOneSq = (r + dpr) ** 2
	const rMinusBzSq = (r - bz) ** 2
	const wBetween = bw - r * 2
	const hBetween = bh - r * 2

	for (let y1 = 0; y1 < bh; y1++) {
		for (let x1 = 0; x1 < bw; x1++) {
			const idx = (y1 * bw + x1) * 4

			const isLeft = x1 < r
			const isRight = x1 >= bw - r
			const isTop = y1 < r
			const isBottom = y1 >= bh - r

			const x = isLeft ? x1 - r : isRight ? x1 - r - wBetween : 0
			const y = isTop ? y1 - r : isBottom ? y1 - r - hBetween : 0

			const dSq = x * x + y * y
			if (dSq > rPlusOneSq || dSq < rMinusBzSq) continue

			const dist = Math.sqrt(dSq)
			const fromSide = r - dist

			const opacity =
				dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(rPlusOneSq) - Math.sqrt(rSq))

			const cos = x / dist
			const sin = -y / dist

			const dotProduct = Math.abs(cos * specVec[0] + sin * specVec[1])
			const coefficient = dotProduct * Math.sqrt(1 - (1 - fromSide / (1 * dpr)) ** 2)
			const color = 255 * coefficient
			const finalOpacity = color * coefficient * opacity

			imageData.data[idx] = color
			imageData.data[idx + 1] = color
			imageData.data[idx + 2] = color
			imageData.data[idx + 3] = finalOpacity
		}
	}

	ctx.putImageData(imageData, 0, 0)
	return canvas.toDataURL('image/png')
}

/* ── Public API ─────────────────────────────────────────────── */

/** Create displacement + specular map assets for a liquid glass element. */
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
		dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1,
	} = params

	const surfaceFn = SURFACE_FNS[bezelType]
	const profile = calculateDisplacementProfile(
		glassThickness,
		bezelWidth,
		surfaceFn,
		refractiveIndex,
	)
	const maxDisplacement = Math.max(...profile.map((v) => Math.abs(v)))

	const displacementDataUrl = rasterizeDisplacementMap(
		width,
		height,
		radius,
		bezelWidth,
		maxDisplacement,
		profile,
		dpr,
	)
	const specularDataUrl = rasterizeSpecularMap(width, height, radius, 50, specularAngle, dpr)

	return { displacementDataUrl, specularDataUrl, maxDisplacement }
}

/** Detect Chromium-based browsers (only Chromium supports SVG backdrop-filter). */
export function isChromium(): boolean {
	if (typeof navigator === 'undefined') {
		return false
	}
	return /Chrome\/\d+/.test(navigator.userAgent)
}
