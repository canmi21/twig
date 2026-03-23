/* src/components/liquid-glass-overlay.tsx */

import type { CSSProperties } from 'react'
import type { UseSvgLiquidGlassResult } from '~/hooks/use-svg-liquid-glass'

const DEFAULT_COLOR_MATRIX = '0.9 0 0 0 0.05 0 0.9 0 0 0.05 0 0 0.9 0 0.05 0 0 0 1 0'

interface LiquidGlassOverlayProps {
	/** Result from useSvgLiquidGlass hook. */
	glass: UseSvgLiquidGlassResult
	/** CSS border-radius for all layers. */
	borderRadius?: number | string
	/** Background color/value for the tint fill layer. */
	background?: string
	/** feColorMatrix values override. */
	colorMatrix?: string
}

/**
 * Renders all liquid glass layers in one component:
 * - SVG filter definition
 * - Edge highlight (inset box-shadow)
 * - SVG filter backdrop (fade-in when active)
 * - CSS blur (frosted fallback → refined)
 * - Background fill (optional)
 *
 * Usage:
 * ```tsx
 * <div ref={glassRef} className="relative rounded-[24px]">
 *   <LiquidGlassOverlay glass={glass} borderRadius={24} background={bg} />
 *   {children}
 * </div>
 * ```
 */
export function LiquidGlassOverlay({
	glass,
	borderRadius,
	background,
	colorMatrix = DEFAULT_COLOR_MATRIX,
}: LiquidGlassOverlayProps) {
	const layerStyle: CSSProperties = {
		position: 'absolute',
		inset: 0,
		borderRadius,
		pointerEvents: 'none',
	}

	return (
		<>
			{/* SVG filter definition */}
			{glass.displacementMap && glass.specularMap ? (
				<svg className="absolute size-0 overflow-hidden" aria-hidden="true" focusable="false">
					<defs>
						<filter
							id={glass.filterId}
							x="0"
							y="0"
							width={glass.width}
							height={glass.height}
							filterUnits="userSpaceOnUse"
							primitiveUnits="userSpaceOnUse"
							colorInterpolationFilters="sRGB"
							filterRes={`${Math.round(glass.width * glass.dpr)} ${Math.round(glass.height * glass.dpr)}`}
						>
							<feColorMatrix
								in="SourceGraphic"
								type="matrix"
								values={colorMatrix}
								result="adjusted_source"
							/>
							<feGaussianBlur
								in="adjusted_source"
								stdDeviation={glass.blur}
								result="blurred_source"
							/>
							<feImage
								href={glass.displacementMap}
								x="0"
								y="0"
								width={glass.width}
								height={glass.height}
								preserveAspectRatio="none"
								result="displacement_map"
							/>
							<feDisplacementMap
								in="blurred_source"
								in2="displacement_map"
								scale={glass.scale}
								xChannelSelector="R"
								yChannelSelector="G"
								result="displaced"
							/>
							<feColorMatrix
								in="displaced"
								type="saturate"
								values={String(glass.saturation)}
								result="displaced_saturated"
							/>
							<feImage
								href={glass.specularMap}
								x="0"
								y="0"
								width={glass.width}
								height={glass.height}
								preserveAspectRatio="none"
								result="specular_layer"
							/>
							<feComposite
								in="displaced_saturated"
								in2="specular_layer"
								operator="in"
								result="specular_saturated"
							/>
							<feComponentTransfer in="specular_layer" result="specular_faded">
								<feFuncA type="linear" slope={String(glass.specularOpacity)} />
							</feComponentTransfer>
							<feBlend
								in="specular_saturated"
								in2="displaced"
								mode="normal"
								result="with_saturation"
							/>
							<feBlend in="specular_faded" in2="with_saturation" mode="normal" />
						</filter>
					</defs>
				</svg>
			) : null}

			{/* Edge highlight */}
			<div style={{ ...layerStyle, boxShadow: glass.edgeHighlight }} />

			{/* SVG filter backdrop */}
			{glass.svgFilter ? (
				<div
					style={{
						...layerStyle,
						animation: glass.fadeInAnimation,
						backdropFilter: glass.svgFilter,
						WebkitBackdropFilter: glass.svgFilter,
					}}
				/>
			) : null}

			{/* CSS blur (fallback + refined) */}
			<div
				style={{
					...layerStyle,
					backdropFilter: glass.cssBlur,
					WebkitBackdropFilter: glass.cssBlur,
					transition: glass.blurTransition,
				}}
			/>

			{/* Background fill */}
			{background ? <div style={{ ...layerStyle, background }} /> : null}
		</>
	)
}
