/* src/components/lamp-cord-toggle.tsx */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'
import { useSvgLiquidGlass } from '~/hooks/use-svg-liquid-glass'
import { applyResolvedTheme, setThemeCookie, useTheme } from '~/lib/theme'

const CORD_REST = 64
const CORD_PULLED = 88
const DRAG_TRIGGER = 120
const DRAG_DEAD_ZONE = 8
const BREAK_SPLIT = 0.3

/** Stump: short cord piece snapping back into ceiling after break */
function BreakStump({
	stretchedHeight,
	restHeight,
	angle,
}: {
	stretchedHeight: number
	restHeight: number
	angle: number
}) {
	return (
		<motion.div
			className="bg-border-strong fixed top-0 right-6 z-50 w-px sm:right-8"
			style={{ transformOrigin: 'top center' }}
			initial={{ height: stretchedHeight, rotate: angle, opacity: 1 }}
			animate={{ height: 0, rotate: 0, opacity: 0 }}
			transition={{
				height: {
					type: 'spring',
					stiffness: 500,
					damping: 25,
					mass: 0.3,
					restDelta: restHeight * 0.05,
				},
				rotate: { type: 'spring', stiffness: 400, damping: 15, mass: 0.3 },
				opacity: { duration: 0.3, delay: 0.3 },
			}}
		/>
	)
}

/** Falling piece: detached cord + handle tumbling down with gravity */
function BreakFall({
	stretchedLength,
	restLength,
	angle,
	startY,
}: {
	stretchedLength: number
	restLength: number
	angle: number
	startY: number
}) {
	const tumbleTo = angle > 0 ? angle + 120 : angle - 120

	return (
		<motion.div
			className="fixed right-6 z-50 flex flex-col items-center sm:right-8"
			style={{ top: startY, transformOrigin: 'top center' }}
			initial={{ y: 0, rotate: angle, opacity: 1 }}
			animate={{
				y: window.innerHeight + 300,
				rotate: tumbleTo,
				opacity: 0,
			}}
			transition={{
				y: { type: 'spring', stiffness: 30, damping: 4, mass: 1.2 },
				rotate: { type: 'spring', stiffness: 40, damping: 6, mass: 0.8 },
				opacity: { duration: 0.4, delay: 0.4 },
			}}
		>
			{/* cord shrinks from stretched to rest length during fall */}
			<motion.div
				className="bg-border-strong w-px"
				initial={{ height: stretchedLength }}
				animate={{ height: restLength }}
				transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.5 }}
			/>
			<div className="bg-content-tertiary size-5 w-2 rounded-full" />
		</motion.div>
	)
}

export function LampCordToggle() {
	const preference = useTheme()

	const [breakState, setBreakState] = useState<null | 'breaking' | 'broken'>(null)
	const [breakSnapshot, setBreakSnapshot] = useState({ angle: 0, length: CORD_REST })

	const handleRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const isToggling = useRef(false)

	const glass = useSvgLiquidGlass(handleRef, {
		radius: 4,
		bezelWidth: 3,
		glassThickness: 15,
		blur: 0.5,
		specularOpacity: 0.5,
		theme: preference,
	})

	const pointerState = useRef<'idle' | 'pressed' | 'dragging'>('idle')
	const pressOrigin = useRef({ x: 0, y: 0 })
	const anchorPos = useRef({ x: 0, y: 0 })
	const lockedAngle = useRef(0)

	const cordLength = useSpring(CORD_REST, { stiffness: 400, damping: 15, mass: 0.5 })
	const cordHeight = useTransform(cordLength, (px) => `${px}px`)
	const cordRotate = useSpring(0, { stiffness: 300, damping: 10, mass: 0.3 })

	const performToggle = useCallback(() => {
		const next = preference === 'dark' ? 'light' : 'dark'

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not all browsers implement View Transition API
		if (document.startViewTransition && handleRef.current) {
			const rect = handleRef.current.getBoundingClientRect()
			const cx = rect.left + rect.width / 2
			const cy = rect.top + rect.height / 2
			const radius = Math.hypot(
				Math.max(cx, window.innerWidth - cx),
				Math.max(cy, window.innerHeight - cy),
			)

			document.documentElement.classList.add('radial-transition')
			const transition = document.startViewTransition(() => {
				applyResolvedTheme(next)
			})

			void transition.ready.then(() => {
				document.documentElement.animate(
					{
						clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`],
					},
					{ duration: 500, easing: 'ease-out', pseudoElement: '::view-transition-new(root)' },
				)
			})

			void transition.finished.then(() => {
				document.documentElement.classList.remove('radial-transition')
			})
		} else {
			applyResolvedTheme(next)
		}

		setThemeCookie(next)
	}, [preference])

	function triggerBreak(dragDist: number) {
		setBreakSnapshot({
			angle: cordRotate.get(),
			length: dragDist,
		})
		setBreakState('breaking')
		setTimeout(() => setBreakState('broken'), 1000)
	}

	function tapToggle() {
		isToggling.current = true

		cordLength.set(CORD_PULLED)
		setTimeout(() => cordLength.set(CORD_REST), 150)

		const base = lockedAngle.current
		cordRotate.set(base + 4)
		setTimeout(() => cordRotate.set(base - 2), 120)
		setTimeout(() => {
			cordRotate.set(0)
			isToggling.current = false
		}, 300)

		performToggle()
	}

	const onPointerDown = useCallback(
		(ev: React.PointerEvent) => {
			if (breakState !== null || isToggling.current) {
				return
			}
			ev.preventDefault()
			buttonRef.current?.setPointerCapture(ev.pointerId)

			pointerState.current = 'pressed'
			pressOrigin.current = { x: ev.clientX, y: ev.clientY }
			lockedAngle.current = cordRotate.get()

			if (buttonRef.current) {
				const { style } = buttonRef.current
				const prevRotate = style.rotate
				style.rotate = '0deg'
				const rect = buttonRef.current.getBoundingClientRect()
				style.rotate = prevRotate
				anchorPos.current = { x: rect.left + rect.width / 2, y: rect.top }
			}
		},
		[breakState, cordRotate],
	)

	const onPointerMove = useCallback(
		(ev: React.PointerEvent) => {
			const state = pointerState.current

			if (state === 'idle') {
				if (!isToggling.current && buttonRef.current) {
					const rect = buttonRef.current.getBoundingClientRect()
					const centerX = rect.left + rect.width / 2
					const offset = (ev.clientX - centerX) / rect.width
					cordRotate.set(offset * 5)
				}
				return
			}

			if (state === 'pressed') {
				const movedX = ev.clientX - pressOrigin.current.x
				const movedY = ev.clientY - pressOrigin.current.y
				if (Math.sqrt(movedX * movedX + movedY * movedY) < DRAG_DEAD_ZONE) {
					return
				}
				pointerState.current = 'dragging'
			}

			const dx = ev.clientX - anchorPos.current.x
			const dy = ev.clientY - anchorPos.current.y
			const dist = Math.sqrt(dx * dx + dy * dy)

			cordLength.jump(Math.max(dist, CORD_REST))
			const angle = Math.atan2(-dx, Math.max(dy, 1)) * (180 / Math.PI)
			cordRotate.jump(angle)
		},
		[cordLength, cordRotate],
	)

	function onPointerUp(ev: React.PointerEvent) {
		const state = pointerState.current
		pointerState.current = 'idle'
		buttonRef.current?.releasePointerCapture(ev.pointerId)

		if (state === 'pressed') {
			tapToggle()
			return
		}

		if (state !== 'dragging') {
			return
		}

		const dx = ev.clientX - anchorPos.current.x
		const dy = ev.clientY - anchorPos.current.y
		const dist = Math.sqrt(dx * dx + dy * dy)
		const halfPage = window.innerHeight / 2

		if (dist >= halfPage) {
			triggerBreak(dist)
			return
		}

		if (dist >= DRAG_TRIGGER) {
			performToggle()
		}

		cordLength.set(CORD_REST)
		cordRotate.set(dist > 40 ? -6 : 0)
		setTimeout(() => cordRotate.set(dist > 40 ? 3 : 0), 150)
		setTimeout(() => cordRotate.set(0), 350)
	}

	function resetFromDrag() {
		if (pointerState.current !== 'idle') {
			pointerState.current = 'idle'
			cordLength.set(CORD_REST)
			cordRotate.set(0)
		}
	}

	const onPointerLeave = useCallback(() => {
		if (pointerState.current === 'idle' && !isToggling.current) {
			cordRotate.set(0)
		}
	}, [cordRotate])

	useEffect(() => {
		const el = buttonRef.current
		if (!el) {
			return
		}
		const prevent = (ev: Event) => ev.preventDefault()
		el.addEventListener('dragstart', prevent)
		return () => el.removeEventListener('dragstart', prevent)
	}, [])

	if (breakState === 'broken') {
		return null
	}

	if (breakState === 'breaking') {
		const stretchedStump = breakSnapshot.length * BREAK_SPLIT
		const stretchedFall = breakSnapshot.length * (1 - BREAK_SPLIT)
		const restStump = CORD_REST * BREAK_SPLIT
		const restFall = CORD_REST * (1 - BREAK_SPLIT)

		return (
			<>
				<BreakStump
					stretchedHeight={stretchedStump}
					restHeight={restStump}
					angle={breakSnapshot.angle}
				/>
				<BreakFall
					stretchedLength={stretchedFall}
					restLength={restFall}
					angle={breakSnapshot.angle}
					startY={stretchedStump}
				/>
			</>
		)
	}

	return (
		<motion.button
			ref={buttonRef}
			type="button"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={resetFromDrag}
			onLostPointerCapture={resetFromDrag}
			onPointerLeave={onPointerLeave}
			className="group fixed top-0 right-6 z-50 flex cursor-pointer touch-none flex-col items-center border-none bg-transparent p-0 sm:right-8"
			aria-label={preference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			style={{
				rotate: cordRotate,
				transformOrigin: 'top center',
			}}
		>
			<motion.div className="bg-border-strong w-px" style={{ height: cordHeight }} />
			<div ref={handleRef} className="relative size-5 w-2 rounded-full">
				{glass.displacementMap && glass.specularMap ? (
					<svg className="absolute size-0 overflow-hidden" aria-hidden="true">
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
									values="0.9 0 0 0 0.05 0 0.9 0 0 0.05 0 0 0.9 0 0.05 0 0 0 1 0"
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
				<div
					className="pointer-events-none absolute inset-0 rounded-full"
					style={{
						backdropFilter: glass.active ? `url(#${glass.filterId})` : 'blur(8px)',
						WebkitBackdropFilter: glass.active ? `url(#${glass.filterId})` : 'blur(8px)',
						background: 'var(--nav-liquid-fill)',
					}}
				/>
			</div>
		</motion.button>
	)
}
