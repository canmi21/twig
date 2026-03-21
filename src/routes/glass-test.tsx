/* src/routes/glass-test.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useSvgLiquidGlass } from '~/hooks/use-svg-liquid-glass'

export const Route = createFileRoute('/glass-test')({
	component: GlassTestPage,
})

interface GlassParams {
	bezelWidth: number
	glassThickness: number
	refractiveIndex: number
	blur: number
	scaleRatio: number
	specularOpacity: number
	specularSaturation: number
	bgOpacity: number
}

const defaultParams: GlassParams = {
	bezelWidth: 29,
	glassThickness: 90,
	refractiveIndex: 1.3,
	blur: 1,
	scaleRatio: 1,
	specularOpacity: 0.4,
	specularSaturation: 6,
	bgOpacity: 0.6,
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

function GlassPanel({ params }: { params: GlassParams }) {
	const ref = useRef<HTMLDivElement>(null)
	const glass = useSvgLiquidGlass(ref, {
		bezelWidth: params.bezelWidth,
		glassThickness: params.glassThickness,
		refractiveIndex: params.refractiveIndex,
		blur: params.blur,
		scaleRatio: params.scaleRatio,
		specularOpacity: params.specularOpacity,
		specularSaturation: params.specularSaturation,
		theme: 'dark',
	})

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
				<svg
					style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
					aria-hidden="true"
				>
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
						>
							<feColorMatrix
								in="SourceGraphic"
								type="matrix"
								values="0.9 0 0 0 -0.3 0 0.9 0 0 -0.3 0 0 0.9 0 -0.3 0 0 0 1 0"
								result="darkened_source"
							/>
							<feGaussianBlur
								in="darkened_source"
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

			<div ref={ref} style={{ position: 'relative', borderRadius: 34 }}>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						borderRadius: 34,
						pointerEvents: 'none',
						backdropFilter,
						WebkitBackdropFilter: backdropFilter,
						background: `rgba(34, 34, 34, ${params.bgOpacity})`,
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
						color: '#fff',
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
					label="BLUR"
					value={params.blur}
					min={0}
					max={8}
					step={0.5}
					onChange={set('blur')}
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
