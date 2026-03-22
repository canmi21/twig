/* src/routes/glass-test.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useSvgLiquidGlass } from '~/hooks/use-svg-liquid-glass'
import { useTheme } from '~/lib/theme'

export const Route = createFileRoute('/glass-test')({
	component: GlassTestPage,
})

interface GlassParams {
	bezelWidth: number
	glassThickness: number
	refractiveIndex: number
	blurX: number
	blurY: number
	scaleRatio: number
	specularOpacity: number
	specularSaturation: number
	bgOpacity: number
	colorScale: number
	colorOffset: number
	supersample: number
	profileSamples: number
	filterResMul: number
	mapBlur: number
	cssBlurEdge: number
	cssBlurInner: number
	useObjectBBox: boolean
	enableColorAdjust: boolean
	enableBlur: boolean
	enableDisplacement: boolean
	enableSaturate: boolean
	enableSpecular: boolean
}

const defaultParams: GlassParams = {
	bezelWidth: 29,
	glassThickness: 90,
	refractiveIndex: 1.3,
	blurX: 0,
	blurY: 0,
	scaleRatio: 1,
	specularOpacity: 0.4,
	specularSaturation: 6,
	bgOpacity: 0,
	colorScale: 0.9,
	colorOffset: 0.05,
	supersample: 1,
	profileSamples: 64,
	filterResMul: 2,
	mapBlur: 0.5,
	cssBlurEdge: 0.5,
	cssBlurInner: 0.2,
	useObjectBBox: false,
	enableColorAdjust: true,
	enableBlur: true,
	enableDisplacement: true,
	enableSaturate: true,
	enableSpecular: true,
}

function buildColorMatrix(scale: number, offset: number): string {
	return `${scale} 0 0 0 ${offset} 0 ${scale} 0 0 ${offset} 0 0 ${scale} 0 ${offset} 0 0 0 1 0`
}

function Slider({
	label,
	value,
	min,
	max,
	step,
	onChange,
}: {
	label: string
	value: number
	min: number
	max: number
	step: number
	onChange: (v: number) => void
}) {
	return (
		<label
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				fontSize: 11,
				color: '#aaa',
				fontFamily: 'monospace',
			}}
		>
			<span style={{ width: 140, textAlign: 'right', flexShrink: 0 }}>{label}</span>
			<span style={{ width: 40, textAlign: 'right', color: '#fff', flexShrink: 0 }}>
				{value.toFixed(2)}
			</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				style={{ width: 160, accentColor: '#f0c040' }}
			/>
		</label>
	)
}

function prevStage(...stages: [string, boolean][]): string {
	for (const [name, enabled] of stages) {
		if (enabled) {
			return name
		}
	}
	return 'SourceGraphic'
}

function GlassFilter({
	glass,
	params,
}: {
	glass: ReturnType<typeof useSvgLiquidGlass>
	params: GlassParams
}) {
	const obb = params.useObjectBBox
	const w = glass.width || 1
	const h = glass.height || 1

	/* objectBoundingBox conversions */
	const imgX = obb ? '0' : '0'
	const imgY = obb ? '0' : '0'
	const imgW = obb ? '1' : String(w)
	const imgH = obb ? '1' : String(h)
	const blurVal = obb
		? `${params.blurX / w} ${params.blurY / h}`
		: `${params.blurX} ${params.blurY}`
	const mapBlurVal = obb ? `${params.mapBlur / w} ${params.mapBlur / h}` : String(params.mapBlur)
	const scaleVal = obb ? glass.scale / w : glass.scale

	const afterColor = prevStage(['after_color', params.enableColorAdjust])
	const afterBlur = prevStage(
		['after_blur', params.enableBlur],
		['after_color', params.enableColorAdjust],
	)
	const afterDisp = prevStage(
		['after_disp', params.enableDisplacement],
		['after_blur', params.enableBlur],
		['after_color', params.enableColorAdjust],
	)
	const afterSat = prevStage(
		['after_sat', params.enableSaturate],
		['after_disp', params.enableDisplacement],
		['after_blur', params.enableBlur],
		['after_color', params.enableColorAdjust],
	)

	return (
		<svg
			style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
			aria-hidden="true"
		>
			<defs>
				<filter
					id={glass.filterId}
					x="0"
					y="0"
					width={obb ? '1' : w}
					height={obb ? '1' : h}
					filterUnits={obb ? 'objectBoundingBox' : 'userSpaceOnUse'}
					primitiveUnits={obb ? 'objectBoundingBox' : 'userSpaceOnUse'}
					colorInterpolationFilters="sRGB"
				>
					{params.enableColorAdjust ? (
						<feColorMatrix
							in="SourceGraphic"
							type="matrix"
							values={buildColorMatrix(params.colorScale, params.colorOffset)}
							result="after_color"
						/>
					) : null}

					{params.enableBlur ? (
						<feGaussianBlur in={afterColor} stdDeviation={blurVal} result="after_blur" />
					) : null}

					{params.enableDisplacement ? (
						<>
							<feImage
								href={glass.displacementMap!}
								x={imgX}
								y={imgY}
								width={imgW}
								height={imgH}
								preserveAspectRatio="none"
								result="displacement_map_raw"
							/>
							{params.mapBlur > 0 ? (
								<feGaussianBlur
									in="displacement_map_raw"
									stdDeviation={mapBlurVal}
									result="displacement_map"
								/>
							) : null}
							<feDisplacementMap
								in={afterBlur}
								in2={params.mapBlur > 0 ? 'displacement_map' : 'displacement_map_raw'}
								scale={scaleVal}
								xChannelSelector="R"
								yChannelSelector="G"
								result="after_disp"
							/>
						</>
					) : null}

					{params.enableSaturate ? (
						<feColorMatrix
							in={afterDisp}
							type="saturate"
							values={String(glass.saturation)}
							result="after_sat"
						/>
					) : null}

					{params.enableSpecular ? (
						<>
							<feImage
								href={glass.specularMap!}
								x={imgX}
								y={imgY}
								width={imgW}
								height={imgH}
								preserveAspectRatio="none"
								result="specular_layer"
							/>
							<feComposite
								in={afterSat}
								in2="specular_layer"
								operator="in"
								result="specular_saturated"
							/>
							<feComponentTransfer in="specular_layer" result="specular_faded">
								<feFuncA type="linear" slope={String(glass.specularOpacity)} />
							</feComponentTransfer>
							<feBlend
								in="specular_saturated"
								in2={afterDisp}
								mode="normal"
								result="with_saturation"
							/>
							<feBlend in="specular_faded" in2="with_saturation" mode="normal" />
						</>
					) : null}
				</filter>
			</defs>
		</svg>
	)
}

function GlassPanel({ params }: { params: GlassParams }) {
	const ref = useRef<HTMLDivElement>(null)
	const theme = useTheme()
	const glass = useSvgLiquidGlass(ref, {
		bezelWidth: params.bezelWidth,
		glassThickness: params.glassThickness,
		refractiveIndex: params.refractiveIndex,
		blur: 0,
		scaleRatio: params.scaleRatio,
		specularOpacity: params.specularOpacity,
		specularSaturation: params.specularSaturation,
		supersample: params.supersample,
		profileSamples: params.profileSamples,
		theme,
	})
	const glassBg = `rgb(var(--glass-base) / ${params.bgOpacity})`

	const backdropFilter = glass.active ? `url(#${glass.filterId})` : 'blur(16px)'

	return (
		<div
			style={{
				position: 'fixed',
				top: '50%',
				left: '50%',
				transform: 'translate(-50%, -50%)',
				zIndex: 50,
			}}
		>
			{glass.displacementMap && glass.specularMap ? (
				<GlassFilter glass={glass} params={params} />
			) : null}

			<div ref={ref} style={{ position: 'relative', borderRadius: 34 }}>
				{/* Layer 1: SVG filter (displacement/specular/color) */}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						borderRadius: 34,
						pointerEvents: 'none',
						backdropFilter,
						WebkitBackdropFilter: backdropFilter,
					}}
				/>
				{/* Layer 2: CSS blur for edge/bezel zone */}
				{params.cssBlurEdge > 0 ? (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: 34,
							pointerEvents: 'none',
							backdropFilter: `blur(${params.cssBlurEdge}px)`,
							WebkitBackdropFilter: `blur(${params.cssBlurEdge}px)`,
						}}
					/>
				) : null}
				{/* Layer 3: CSS blur for inner zone (clipped inside bezel) */}
				{params.cssBlurInner > 0 ? (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: 34,
							pointerEvents: 'none',
							backdropFilter: `blur(${params.cssBlurInner}px)`,
							WebkitBackdropFilter: `blur(${params.cssBlurInner}px)`,
							clipPath: `inset(${params.bezelWidth}px round ${Math.max(0, 34 - params.bezelWidth)}px)`,
						}}
					/>
				) : null}
				{/* Layer 4: background fill */}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						borderRadius: 34,
						pointerEvents: 'none',
						background: glassBg,
					}}
				/>
				<div
					style={{
						position: 'relative',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						gap: 24,
						borderRadius: 34,
						padding: '14px 28px',
						color: 'var(--text-heading)',
						fontSize: 15,
						fontWeight: 600,
					}}
				>
					<span>Home</span>
					<span>Blog</span>
					<span>Note</span>
					<span>Code</span>
					<span>More</span>
				</div>
			</div>
		</div>
	)
}

function GlassTestPage() {
	const [params, setParams] = useState<GlassParams>(defaultParams)
	const set = (key: keyof GlassParams) => (v: number) =>
		setParams((prev) => ({ ...prev, [key]: v }))

	return (
		<div style={{ minHeight: '300vh', background: '#0A0A0A', fontFamily: 'system-ui, sans-serif' }}>
			<GlassPanel params={params} />

			<div
				style={{
					position: 'fixed',
					top: 12,
					right: 12,
					zIndex: 100,
					background: 'rgba(0,0,0,0.85)',
					borderRadius: 12,
					padding: '12px 16px',
					display: 'flex',
					flexDirection: 'column',
					gap: 4,
					border: '1px solid #333',
				}}
			>
				<div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace', marginBottom: 4 }}>
					PARAMETERS
				</div>
				<Slider
					label="BEZEL WIDTH"
					value={params.bezelWidth}
					min={1}
					max={50}
					step={1}
					onChange={set('bezelWidth')}
				/>
				<Slider
					label="GLASS THICKNESS"
					value={params.glassThickness}
					min={10}
					max={300}
					step={5}
					onChange={set('glassThickness')}
				/>
				<Slider
					label="REFRACTIVE INDEX"
					value={params.refractiveIndex}
					min={1}
					max={2.5}
					step={0.05}
					onChange={set('refractiveIndex')}
				/>
				<Slider
					label="BLUR X"
					value={params.blurX}
					min={0}
					max={8}
					step={0.1}
					onChange={set('blurX')}
				/>
				<Slider
					label="BLUR Y"
					value={params.blurY}
					min={0}
					max={8}
					step={0.1}
					onChange={set('blurY')}
				/>
				<Slider
					label="SCALE RATIO"
					value={params.scaleRatio}
					min={0}
					max={1}
					step={0.05}
					onChange={set('scaleRatio')}
				/>
				<Slider
					label="SPECULAR OPACITY"
					value={params.specularOpacity}
					min={0}
					max={1}
					step={0.05}
					onChange={set('specularOpacity')}
				/>
				<Slider
					label="SPECULAR SATURATION"
					value={params.specularSaturation}
					min={0}
					max={20}
					step={0.5}
					onChange={set('specularSaturation')}
				/>
				<Slider
					label="BG OPACITY"
					value={params.bgOpacity}
					min={0}
					max={1}
					step={0.05}
					onChange={set('bgOpacity')}
				/>
				<Slider
					label="COLOR SCALE"
					value={params.colorScale}
					min={0.5}
					max={1.5}
					step={0.01}
					onChange={set('colorScale')}
				/>
				<Slider
					label="COLOR OFFSET"
					value={params.colorOffset}
					min={-0.5}
					max={0.5}
					step={0.01}
					onChange={set('colorOffset')}
				/>
				<Slider
					label="SUPERSAMPLE"
					value={params.supersample}
					min={1}
					max={8}
					step={1}
					onChange={set('supersample')}
				/>
				<Slider
					label="PROFILE SAMPLES"
					value={params.profileSamples}
					min={64}
					max={512}
					step={64}
					onChange={set('profileSamples')}
				/>
				<Slider
					label="CSS BLUR EDGE"
					value={params.cssBlurEdge}
					min={0}
					max={8}
					step={0.1}
					onChange={set('cssBlurEdge')}
				/>
				<Slider
					label="CSS BLUR INNER"
					value={params.cssBlurInner}
					min={0}
					max={8}
					step={0.1}
					onChange={set('cssBlurInner')}
				/>
				<Slider
					label="MAP BLUR"
					value={params.mapBlur}
					min={0}
					max={4}
					step={0.1}
					onChange={set('mapBlur')}
				/>
				<Slider
					label="FILTER RES MUL"
					value={params.filterResMul}
					min={0.5}
					max={8}
					step={0.5}
					onChange={set('filterResMul')}
				/>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						marginTop: 8,
						borderTop: '1px solid #333',
						paddingTop: 8,
					}}
				>
					<div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>FILTER STAGES</div>
					{(
						[
							['useObjectBBox', 'OBJ BBOX MODE'],
							['enableColorAdjust', 'COLOR ADJUST'],
							['enableBlur', 'BLUR'],
							['enableDisplacement', 'DISPLACEMENT'],
							['enableSaturate', 'SATURATE'],
							['enableSpecular', 'SPECULAR'],
						] as const
					).map(([key, label]) => (
						<label
							key={key}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								fontSize: 11,
								color: '#aaa',
								fontFamily: 'monospace',
								cursor: 'pointer',
							}}
						>
							<input
								type="checkbox"
								checked={params[key]}
								onChange={(e) => setParams((prev) => ({ ...prev, [key]: e.target.checked }))}
								style={{ accentColor: '#f0c040' }}
							/>
							{label}
						</label>
					))}
				</div>
				<button
					type="button"
					onClick={() => setParams(defaultParams)}
					style={{
						marginTop: 4,
						padding: '4px 8px',
						fontSize: 10,
						fontFamily: 'monospace',
						background: '#333',
						color: '#aaa',
						border: '1px solid #555',
						borderRadius: 4,
						cursor: 'pointer',
					}}
				>
					RESET
				</button>
			</div>

			<div style={{ padding: '40px 60px' }}>
				<div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
					{[
						'#e74c3c',
						'#3498db',
						'#f1c40f',
						'#2ecc71',
						'#9b59b6',
						'#e67e22',
						'#1abc9c',
						'#e91e63',
					].map((c) => (
						<div key={c} style={{ width: 140, height: 100, borderRadius: 12, background: c }} />
					))}
				</div>
				<p
					style={{ color: '#fff', fontSize: 28, lineHeight: 1.8, maxWidth: 900, marginBottom: 40 }}
				>
					The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur
					adipiscing elit.
				</p>
				<div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
					<div
						style={{
							width: 200,
							height: 200,
							borderRadius: 16,
							background: 'linear-gradient(135deg, #667eea, #764ba2)',
						}}
					/>
					<div
						style={{
							width: 200,
							height: 200,
							borderRadius: 16,
							background: 'linear-gradient(135deg, #f093fb, #f5576c)',
						}}
					/>
					<div
						style={{
							width: 200,
							height: 200,
							borderRadius: 16,
							background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
						}}
					/>
					<div
						style={{
							width: 200,
							height: 200,
							borderRadius: 16,
							background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
						}}
					/>
				</div>
				<p style={{ color: '#aaa', fontSize: 18, lineHeight: 2, maxWidth: 800, marginBottom: 40 }}>
					Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
					commodo consequat.
				</p>
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
					{Array.from({ length: 40 }, (_, i) => (
						<div
							key={i}
							style={{
								width: 32,
								height: 32,
								borderRadius: '50%',
								background: `hsl(${i * 9}, 70%, 55%)`,
							}}
						/>
					))}
				</div>
				<div style={{ height: 400 }} />
				<h2 style={{ color: '#fff', fontSize: 72, fontWeight: 900, marginBottom: 20 }}>
					LIQUID GLASS
				</h2>
				<p style={{ color: '#666', fontSize: 16, lineHeight: 2, maxWidth: 600 }}>
					Scroll to move content behind the glass. Use sliders to tune parameters.
				</p>
				<div style={{ height: 600 }} />
			</div>
		</div>
	)
}
