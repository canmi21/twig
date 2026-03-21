/* src/lib/liquid-glass.ts */

/**
 * WebGL-based liquid glass refraction effect.
 *
 * Provides a shared renderer (one per page) that creates a full-viewport
 * WebGL canvas, captures the page via html-to-image (toCanvas), and renders per-element
 * glass lenses with GLSL refraction, bevel, frost, specular, tilt, mirror,
 * shadow, and reveal animation effects.
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition -- Defensive runtime checks from original library */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- Intentional || for falsy coalescing in some cases */
/* eslint-disable @typescript-eslint/prefer-optional-chain -- Preserved from reference implementation */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents -- WebGL interop types */
/* eslint-disable no-prototype-builtins -- Preserved from reference implementation */
/* eslint-disable better-tailwindcss/no-unknown-classes -- Dynamic CSS class prefix */

/* ── Utility types ───────────────────────────────────────────── */

export interface LensOptions {
	/** CSS selector or element(s) to target. Default ".liquidGL". */
	target?: string
	/** CSS selector for snapshot root. Default "body". */
	snapshot?: string
	/** Snapshot resolution scale. Default 2.0. */
	resolution?: number
	/** Refraction strength. Default 0.01. */
	refraction?: number
	/** Bevel depth. Default 0.08. */
	bevelDepth?: number
	/** Bevel width. Default 0.15. */
	bevelWidth?: number
	/** Frost blur amount. Default 0. */
	frost?: number
	/** Smooth blur amount. Default 0. */
	blur?: number
	/** Extra edge-weighted blur strength. Default 0. */
	progressiveBlurStrength?: number
	/** Show drop shadow. Default true. */
	shadow?: boolean
	/** Enable specular highlights. Default true. */
	specular?: boolean
	/** Specular highlight opacity. Default 0.4. */
	specularOpacity?: number
	/** Specular highlight concentration. Default 6. */
	specularSaturation?: number
	/** Reveal animation type: "fade" or "none". Default "fade". */
	reveal?: 'fade' | 'none'
	/** Enable pointer-driven tilt effect. Default false. */
	tilt?: boolean
	/** Max tilt angle in degrees. Default 5. */
	tiltFactor?: number
	/** Magnification factor. Default 1. */
	magnify?: number
	/** Keep rendering every frame. Default true. */
	continuous?: boolean
	/** Event callbacks. */
	on?: LensEventCallbacks
}

export interface LensEventCallbacks {
	init?: (lens: LiquidGlassLens) => void
}

export interface RendererUniformLocations {
	tex: WebGLUniformLocation | null
	res: WebGLUniformLocation | null
	textureResolution: WebGLUniformLocation | null
	bounds: WebGLUniformLocation | null
	refraction: WebGLUniformLocation | null
	bevelDepth: WebGLUniformLocation | null
	bevelWidth: WebGLUniformLocation | null
	frost: WebGLUniformLocation | null
	blur: WebGLUniformLocation | null
	progressiveBlurStrength: WebGLUniformLocation | null
	radius: WebGLUniformLocation | null
	time: WebGLUniformLocation | null
	specular: WebGLUniformLocation | null
	specularOpacity: WebGLUniformLocation | null
	specularSaturation: WebGLUniformLocation | null
	revealProgress: WebGLUniformLocation | null
	revealType: WebGLUniformLocation | null
	tiltX: WebGLUniformLocation | null
	tiltY: WebGLUniformLocation | null
	magnify: WebGLUniformLocation | null
}

export interface LensRect {
	left: number
	top: number
	width: number
	height: number
}

export interface BorderRadii {
	tl: number
	tr: number
	br: number
	bl: number
}

interface DynamicNode {
	el: HTMLElement
}

interface DynamicMeta {
	_capturing: boolean
	prevDrawRect: DrawRect | null
	lastCapture: HTMLCanvasElement | null
	needsRecapture: boolean
	hoverClassName: string | null
	_animating: boolean
	_rafId: number | null
	_lastCaptureTs: number
	_heavyAnim: boolean
}

interface DrawRect {
	x: number
	y: number
	w: number
	h: number
}

interface DynWorkerJob {
	x: number
	y: number
	w: number
	h: number
}

export interface SyncWithConfig {
	lenis?: unknown
	locomotiveScroll?: unknown
	gsap?: boolean | unknown
}

/* ── Utility functions ───────────────────────────────────────── */

function debounce<TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
	wait: number,
): (...args: TArgs) => void {
	let timerId: ReturnType<typeof setTimeout>
	return (...args: TArgs) => {
		clearTimeout(timerId)
		timerId = setTimeout(() => fn.apply(null, args), wait)
	}
}

function rectsIntersect(rectA: DOMRect | LensRect, rectB: DOMRect | LensRect): boolean {
	return (
		rectA.left < rectB.left + rectB.width &&
		rectA.left + rectA.width > rectB.left &&
		rectA.top < rectB.top + rectB.height &&
		rectA.top + rectA.height > rectB.top
	)
}

function findAppliedHoverStyles(targetElement: HTMLElement): string {
	let cssText = ''
	for (const sheet of document.styleSheets) {
		try {
			for (const rule of sheet.cssRules) {
				if (!(rule instanceof CSSStyleRule) || !rule.selectorText?.includes(':hover')) {
					continue
				}
				const baseSelector = rule.selectorText.split(':hover')[0]
				if (targetElement.matches(baseSelector)) {
					cssText += rule.style.cssText
				}
			}
		} catch {
			// Cross-origin stylesheet access may throw
		}
	}
	return cssText
}

function effectiveZ(el: HTMLElement): number {
	let node: HTMLElement | null = el
	while (node && node !== document.body) {
		const style = window.getComputedStyle(node)
		if (style.position !== 'static' && style.zIndex !== 'auto') {
			const zValue = parseInt(style.zIndex, 10)
			if (!isNaN(zValue)) return zValue
		}
		node = node.parentElement
	}
	return 0
}

function compileShader(
	gl: WebGLRenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = gl.createShader(type)
	if (!shader) return null
	gl.shaderSource(shader, source.trim())
	gl.compileShader(shader)
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		/* oxlint-disable-next-line no-console -- WebGL diagnostic */
		console.error('Shader error', gl.getShaderInfoLog(shader))
		gl.deleteShader(shader)
		return null
	}
	return shader
}

function createProgram(
	gl: WebGLRenderingContext,
	vsSource: string,
	fsSource: string,
): WebGLProgram | null {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource)
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource)
	if (!vertexShader || !fragmentShader) return null
	const program = gl.createProgram()
	if (!program) return null
	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)
	gl.linkProgram(program)
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		/* oxlint-disable-next-line no-console -- WebGL diagnostic */
		console.error('Program link error', gl.getProgramInfoLog(program))
		return null
	}
	return program
}

import { toCanvas } from 'html-to-image'
/* ── Shared renderer (one per page) ──────────────────────────── */

export class LiquidGlassRenderer {
	canvas: HTMLCanvasElement
	gl: WebGLRenderingContext
	lenses: LiquidGlassLens[]
	texture: WebGLTexture | null
	textureWidth: number
	textureHeight: number
	scaleFactor: number
	startTime: number
	program: WebGLProgram
	uniforms: RendererUniformLocations
	snapshotTarget: HTMLElement
	staticSnapshotCanvas: HTMLCanvasElement | null
	useExternalTicker: boolean

	_scrollUpdateCounter: number
	_isScrolling: boolean
	_capturing: boolean
	_revealAnimating: boolean
	_rafId: number | null

	_dynamicNodes: DynamicNode[]
	_dynMeta: WeakMap<HTMLElement, DynamicMeta>
	_lastDynamicUpdate: number
	_dynamicStyleSheet: CSSStyleSheet

	_videoNodes: HTMLVideoElement[]
	_tmpCanvas: HTMLCanvasElement
	_tmpCtx: CanvasRenderingContext2D
	_compositeCtx: CanvasRenderingContext2D | null

	_snapshotResolution: number
	_pendingReveal: LiquidGlassLens[]

	_workerEnabled: boolean
	_dynWorker: Worker | null
	_dynJobs: Map<string, DynWorkerJob> | null

	constructor(snapshotSelector: string, snapshotResolution = 1.0) {
		this.canvas = document.createElement('canvas')
		this.canvas.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;`
		this.canvas.setAttribute('data-liquid-ignore', '')
		document.body.appendChild(this.canvas)

		const contextAttributes: WebGLContextAttributes = {
			alpha: true,
			premultipliedAlpha: true,
			preserveDrawingBuffer: true,
		}
		const glContext =
			this.canvas.getContext('webgl2', contextAttributes) ??
			this.canvas.getContext('webgl', contextAttributes) ??
			this.canvas.getContext('experimental-webgl', contextAttributes)
		if (!glContext) throw new Error('liquidGL: WebGL unavailable')
		this.gl = glContext as WebGLRenderingContext

		this.lenses = []
		this.texture = null
		this.textureWidth = 0
		this.textureHeight = 0
		this.scaleFactor = 1
		this.startTime = Date.now()
		this._scrollUpdateCounter = 0
		this._capturing = false
		this._revealAnimating = false
		this._rafId = null
		this.staticSnapshotCanvas = null
		this._compositeCtx = null
		this._dynWorker = null
		this._dynJobs = null

		this.program = null!
		this.uniforms = null!
		this._initGL()

		this.snapshotTarget = document.querySelector<HTMLElement>(snapshotSelector) ?? document.body

		this._isScrolling = false
		let lastScrollY = window.scrollY
		let scrollTimeout: ReturnType<typeof setTimeout>
		const scrollCheck = () => {
			if (window.scrollY !== lastScrollY) {
				this._isScrolling = true
				lastScrollY = window.scrollY
				clearTimeout(scrollTimeout)
				scrollTimeout = setTimeout(() => {
					this._isScrolling = false
				}, 200)
			}
			requestAnimationFrame(scrollCheck)
		}
		requestAnimationFrame(scrollCheck)

		const onResize = debounce(() => {
			if (this._capturing || this._isScrolling) return

			if (window.visualViewport && window.visualViewport.scale !== 1) {
				return
			}

			for (const node of this._dynamicNodes) {
				const meta = this._dynMeta.get(node.el)
				if (meta) {
					meta.needsRecapture = true
					meta.prevDrawRect = null
					meta.lastCapture = null
				}
			}

			this._resizeCanvas()
			for (const lens of this.lenses) {
				lens.updateMetrics()
			}
			void this.captureSnapshot()
		}, 250)
		window.addEventListener('resize', onResize, { passive: true })

		if ('ResizeObserver' in window) {
			new ResizeObserver(onResize).observe(this.snapshotTarget)
		}

		/* Dynamic DOM elements (non-video, e.g. animating text) */
		this._dynamicNodes = []
		this._dynMeta = new WeakMap()
		this._lastDynamicUpdate = 0

		const styleElement = document.createElement('style')
		styleElement.id = 'liquid-gl-dynamic-styles'
		document.head.appendChild(styleElement)
		this._dynamicStyleSheet = styleElement.sheet!

		this._resizeCanvas()
		void this.captureSnapshot()

		this._pendingReveal = []

		/* Dynamic media (video) support */
		this._videoNodes = Array.from(this.snapshotTarget.querySelectorAll('video'))
		this._videoNodes = this._videoNodes.filter((videoEl) => !this._isIgnored(videoEl))
		this._tmpCanvas = document.createElement('canvas')
		this._tmpCtx = this._tmpCanvas.getContext('2d')!

		this.canvas.style.opacity = '0'

		this._snapshotResolution = Math.max(0.1, Math.min(3.0, snapshotResolution))

		this.useExternalTicker = false

		/* Inline worker for heavy dynamic nodes */
		this._workerEnabled =
			typeof OffscreenCanvas !== 'undefined' &&
			typeof Worker !== 'undefined' &&
			typeof ImageBitmap !== 'undefined'

		if (this._workerEnabled) {
			const workerSource = `
          /* dynamic-element worker (runs in its own thread) */
          self.onmessage = async (e) => {
            const { id, width, height, snap, dyn } = e.data;
            const off = new OffscreenCanvas(width, height);
            const ctx = off.getContext('2d');

            ctx.drawImage(snap, 0, 0, width, height);
            ctx.drawImage(dyn, 0, 0, width, height);

            const bmp = await off.transferToImageBitmap();
            self.postMessage({ id, bmp }, [bmp]);
          };
        `
			const blob = new Blob([workerSource], {
				type: 'application/javascript',
			})
			this._dynWorker = new Worker(URL.createObjectURL(blob), {
				type: 'module',
			})

			this._dynJobs = new Map()

			this._dynWorker.addEventListener('message', (event: MessageEvent) => {
				const { id, bmp } = event.data as {
					id: string
					bmp: ImageBitmap
				}
				const jobMeta = this._dynJobs!.get(id)
				if (!jobMeta) {
					return
				}
				this._dynJobs!.delete(id)

				const { x, y } = jobMeta
				const gl = this.gl
				gl.bindTexture(gl.TEXTURE_2D, this.texture)
				gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
			})
		}
	}

	/* ── Initialize WebGL program and shaders ──────────────── */
	private _initGL(): void {
		const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main(){
          v_uv = (a_position + 1.0) * 0.5;
          gl_Position = vec4(a_position, 0.0, 1.0);
        }`

		const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_uv;
        uniform sampler2D u_tex;
        uniform vec2  u_resolution;
        uniform vec2  u_textureResolution;
        uniform vec4  u_bounds;
        uniform float u_refraction;
        uniform float u_bevelDepth;
        uniform float u_bevelWidth;
        uniform float u_frost;
        uniform float u_blur;
        uniform float u_progressiveBlurStrength;
        uniform float u_radius;
        uniform float u_time;
        uniform bool  u_specular;
        uniform float u_specularOpacity;
        uniform float u_specularSaturation;
        uniform float u_revealProgress;
        uniform int   u_revealType;
        uniform float u_tiltX;
        uniform float u_tiltY;
        uniform float u_magnify;

        float udRoundBox( vec2 p, vec2 b, float r ) {
          return length(max(abs(p)-b+r,0.0))-r;
        }

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec4 sampleSmoothBlur(vec2 uv, vec2 texel, float radius) {
          vec2 step = texel * radius;
          vec4 sum = texture2D(u_tex, uv) * 0.24;
          sum += texture2D(u_tex, uv + vec2( step.x, 0.0)) * 0.12;
          sum += texture2D(u_tex, uv + vec2(-step.x, 0.0)) * 0.12;
          sum += texture2D(u_tex, uv + vec2(0.0,  step.y)) * 0.12;
          sum += texture2D(u_tex, uv + vec2(0.0, -step.y)) * 0.12;
          sum += texture2D(u_tex, uv + vec2( step.x,  step.y)) * 0.07;
          sum += texture2D(u_tex, uv + vec2(-step.x,  step.y)) * 0.07;
          sum += texture2D(u_tex, uv + vec2( step.x, -step.y)) * 0.07;
          sum += texture2D(u_tex, uv + vec2(-step.x, -step.y)) * 0.07;
          return sum;
        }

        float edgeFactor(vec2 uv, float radius_px){
          vec2 p_px = (uv - 0.5) * u_resolution;
          vec2 b_px = 0.5 * u_resolution;
          float d = -udRoundBox(p_px, b_px, radius_px);
          float bevel_px = u_bevelWidth * min(u_resolution.x, u_resolution.y);
          return 1.0 - smoothstep(0.0, bevel_px, d);
        }
        void main(){
          vec2 p = v_uv - 0.5;
          p.x *= u_resolution.x / u_resolution.y;

          float edge = edgeFactor(v_uv, u_radius);
          float min_dimension = min(u_resolution.x, u_resolution.y);
          float edgeRefraction = pow(edge, 2.4) * u_refraction;
          float edgeBevel = pow(edge, 14.0) * u_bevelDepth * 0.55;
          float offsetAmt = edgeRefraction + edgeBevel;
          float centreBlend = smoothstep(0.15, 0.45, length(p));
          vec2 offset = normalize(p) * offsetAmt * centreBlend;

          float tiltRefractionScale = 0.05;
          vec2 tiltOffset = vec2(tan(radians(u_tiltY)), -tan(radians(u_tiltX))) * tiltRefractionScale;

          vec2 localUV = (v_uv - 0.5) / u_magnify + 0.5;
          vec2 flippedUV = vec2(localUV.x, 1.0 - localUV.y);
          vec2 mapped = u_bounds.xy + flippedUV * u_bounds.zw;
          vec2 refracted = mapped + offset - tiltOffset;

          float oob = max(max(-refracted.x, refracted.x - 1.0), max(-refracted.y, refracted.y - 1.0));
          float blend = 1.0 - smoothstep(0.0, 0.01, oob);
          vec2 sampleUV = mix(mapped, refracted, blend);

          vec4 baseCol   = texture2D(u_tex, mapped);

          vec2 texel = 1.0 / u_textureResolution;
          float blurRadius = u_blur * (1.0 + edge * u_progressiveBlurStrength) * 3.0;
          vec4 refrCol = u_blur > 0.0
            ? sampleSmoothBlur(sampleUV, texel, blurRadius)
            : texture2D(u_tex, sampleUV);

          if (u_frost > 0.0) {
              float radius = u_frost * (1.0 + edge * u_progressiveBlurStrength) * 4.0;
              vec4 sum = vec4(0.0);
              const int SAMPLES = 16;

              for (int i = 0; i < SAMPLES; i++) {
                  float angle = random(v_uv + float(i)) * 6.283185;
                  float dist = sqrt(random(v_uv - float(i))) * radius;
                  vec2 offset = vec2(cos(angle), sin(angle)) * texel * dist;
                  sum += texture2D(u_tex, sampleUV + offset);
              }
              vec4 frostCol = sum / float(SAMPLES);
              refrCol = u_blur > 0.0 ? mix(refrCol, frostCol, min(1.0, u_frost)) : frostCol;
          } else if (u_blur <= 0.0) {
              refrCol += texture2D(u_tex, sampleUV + vec2( texel.x, 0.0));
              refrCol += texture2D(u_tex, sampleUV + vec2(-texel.x, 0.0));
              refrCol += texture2D(u_tex, sampleUV + vec2(0.0,  texel.y));
              refrCol += texture2D(u_tex, sampleUV + vec2(0.0, -texel.y));
              refrCol /= 5.0;
          }

          if (refrCol.a < 0.1) {
              refrCol = baseCol;
          }

          float diff = clamp(length(refrCol.rgb - baseCol.rgb) * 4.0, 0.0, 1.0);

          float antiHalo = (1.0 - centreBlend) * diff;

          vec4 final    = refrCol;

          vec2 p_px = (v_uv - 0.5) * u_resolution;
          vec2 b_px = 0.5 * u_resolution;
          float dmask = udRoundBox(p_px, b_px, u_radius);
          float inShape = 1.0 - step(0.0, dmask);

          if (u_specular) {
            vec2 normal2D = normalize(vec2(
              p_px.x / max(u_resolution.x, 1.0),
              p_px.y / max(u_resolution.y, 1.0)
            ) + vec2(0.0001));
            vec2 lightDir = normalize(vec2(-0.45, -1.0));
            float ndl = max(dot(normal2D, -lightDir), 0.0);
            float gloss = pow(ndl, max(1.0, u_specularSaturation));

            float outerBand = smoothstep(0.58, 0.86, edge);
            float innerBand = 1.0 - smoothstep(0.82, 0.965, edge);
            float edgeBand = outerBand * innerBand;

            float highlightAlpha = gloss * edgeBand * u_specularOpacity;
            highlightAlpha *= 1.0 - antiHalo * 0.55;

            float luminance = dot(final.rgb, vec3(0.299, 0.587, 0.114));
            vec3 specTint = mix(vec3(0.84, 0.86, 0.9), vec3(0.96, 0.97, 0.99), 1.0 - luminance);
            vec3 screened = 1.0 - (1.0 - final.rgb) * (1.0 - specTint);
            final.rgb = mix(final.rgb, screened, highlightAlpha);
          }

          if (u_revealType == 1) {
              final.rgb *= u_revealProgress;
              final.a  *= u_revealProgress;
          }

          final.rgb *= inShape;
          final.a   *= inShape;

          gl_FragColor = final;
        }`

		this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource)!
		const gl = this.gl
		if (!this.program) throw new Error('liquidGL: Shader failed')

		const positionBuffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW,
		)

		const positionLocation = gl.getAttribLocation(this.program, 'a_position')
		gl.enableVertexAttribArray(positionLocation)
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

		this.uniforms = {
			tex: gl.getUniformLocation(this.program, 'u_tex'),
			res: gl.getUniformLocation(this.program, 'u_resolution'),
			textureResolution: gl.getUniformLocation(this.program, 'u_textureResolution'),
			bounds: gl.getUniformLocation(this.program, 'u_bounds'),
			refraction: gl.getUniformLocation(this.program, 'u_refraction'),
			bevelDepth: gl.getUniformLocation(this.program, 'u_bevelDepth'),
			bevelWidth: gl.getUniformLocation(this.program, 'u_bevelWidth'),
			frost: gl.getUniformLocation(this.program, 'u_frost'),
			blur: gl.getUniformLocation(this.program, 'u_blur'),
			progressiveBlurStrength: gl.getUniformLocation(this.program, 'u_progressiveBlurStrength'),
			radius: gl.getUniformLocation(this.program, 'u_radius'),
			time: gl.getUniformLocation(this.program, 'u_time'),
			specular: gl.getUniformLocation(this.program, 'u_specular'),
			specularOpacity: gl.getUniformLocation(this.program, 'u_specularOpacity'),
			specularSaturation: gl.getUniformLocation(this.program, 'u_specularSaturation'),
			revealProgress: gl.getUniformLocation(this.program, 'u_revealProgress'),
			revealType: gl.getUniformLocation(this.program, 'u_revealType'),
			tiltX: gl.getUniformLocation(this.program, 'u_tiltX'),
			tiltY: gl.getUniformLocation(this.program, 'u_tiltY'),
			magnify: gl.getUniformLocation(this.program, 'u_magnify'),
		}
	}

	/* ── Resize canvas to match viewport ───────────────────── */
	private _resizeCanvas(): void {
		const dpr = Math.min(2, window.devicePixelRatio ?? 1)
		this.canvas.width = innerWidth * dpr
		this.canvas.height = innerHeight * dpr
		this.canvas.style.width = `${innerWidth}px`
		this.canvas.style.height = `${innerHeight}px`
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
	}

	/* ── Capture page snapshot via html-to-image (toCanvas) ─────────────── */
	async captureSnapshot(): Promise<boolean | undefined> {
		if (this._capturing) {
			return
		}
		this._capturing = true

		const undoActions: Array<() => void> = []

		const attemptCapture = async (
			attempt = 1,
			maxAttempts = 3,
			delayMs = 500,
		): Promise<boolean> => {
			try {
				const fullWidth = this.snapshotTarget.scrollWidth
				const fullHeight = this.snapshotTarget.scrollHeight
				const maxTextureSize = (this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number) ?? 8192
				const MAX_MOBILE_DIM = 4096
				const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent)

				let scale = Math.min(
					this._snapshotResolution,
					maxTextureSize / fullWidth,
					maxTextureSize / fullHeight,
				)

				if (isMobileSafari) {
					const overSize = (Math.max(fullWidth, fullHeight) * scale) / MAX_MOBILE_DIM
					if (overSize > 1) scale = scale / overSize
				}
				this.scaleFactor = Math.max(0.1, scale)

				this.canvas.style.visibility = 'hidden'
				undoActions.push(() => (this.canvas.style.visibility = 'visible'))

				const lensElements = this.lenses
					.flatMap((lens) => [lens.el, lens._shadowEl])
					.filter(Boolean) as HTMLElement[]

				const ignoreElementsFunc = (element: Element): boolean => {
					if (!element?.hasAttribute) return false
					if (element === this.canvas || lensElements.includes(element as HTMLElement)) {
						return true
					}
					const style = window.getComputedStyle(element)
					if (style.position === 'fixed') {
						return true
					}
					return !!(
						element.hasAttribute('data-liquid-ignore') || element.closest('[data-liquid-ignore]')
					)
				}

				const snapshotCanvas = await toCanvas(this.snapshotTarget, {
					width: fullWidth,
					height: fullHeight,
					pixelRatio: scale,
					filter: (node: Node) => !ignoreElementsFunc(node as Element),
					cacheBust: true,
				})

				this._uploadTexture(snapshotCanvas)
				return true
			} catch (error) {
				/* oxlint-disable-next-line no-console -- WebGL diagnostic */
				console.error(`liquidGL snapshot failed on attempt ${attempt}`, error)
				if (attempt < maxAttempts) {
					/* oxlint-disable-next-line no-console -- WebGL diagnostic */
					console.log(`Retrying snapshot capture (${attempt + 1}/${maxAttempts})...`)
					await new Promise((resolve) => setTimeout(resolve, delayMs))
					return await attemptCapture(attempt + 1, maxAttempts, delayMs)
				} else {
					/* oxlint-disable-next-line no-console -- WebGL diagnostic */
					console.error('liquidGL: All snapshot attempts failed.', error)
					return false
				}
			} finally {
				for (let i = undoActions.length - 1; i >= 0; i--) {
					undoActions[i]()
				}
				this._capturing = false
			}
		}

		return await attemptCapture()
	}

	/* ── Upload canvas to WebGL texture ────────────────────── */
	private _uploadTexture(sourceCanvas: HTMLCanvasElement | OffscreenCanvas | null): void {
		if (!sourceCanvas) return

		let uploadCanvas: HTMLCanvasElement
		if (!(sourceCanvas instanceof HTMLCanvasElement)) {
			const tmpCanvas = document.createElement('canvas')
			tmpCanvas.width = sourceCanvas.width || 0
			tmpCanvas.height = sourceCanvas.height || 0
			if (tmpCanvas.width === 0 || tmpCanvas.height === 0) return
			try {
				const ctx = tmpCanvas.getContext('2d')!
				ctx.drawImage(sourceCanvas, 0, 0)
				uploadCanvas = tmpCanvas
			} catch (error) {
				/* oxlint-disable-next-line no-console -- WebGL diagnostic */
				console.warn('liquidGL: Unable to convert OffscreenCanvas for upload', error)
				return
			}
		} else {
			uploadCanvas = sourceCanvas
		}

		if (uploadCanvas.width === 0 || uploadCanvas.height === 0) return
		this.staticSnapshotCanvas = uploadCanvas
		const gl = this.gl
		this.texture ??= gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, this.texture)
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uploadCanvas)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

		this.textureWidth = uploadCanvas.width
		this.textureHeight = uploadCanvas.height

		this.render()

		if (this._pendingReveal.length) {
			for (const lens of this._pendingReveal) {
				lens._reveal()
			}
			this._pendingReveal.length = 0
		}
	}

	/* ── Add a lens for an element ─────────────────────────── */
	addLens(element: HTMLElement, options: LensOptions): LiquidGlassLens {
		const lens = new LiquidGlassLens(this, element, options)
		this.lenses.push(lens)

		const maxZ = this._getMaxLensZ()
		if (maxZ > 0) {
			this.canvas.style.zIndex = String(maxZ - 1)
		}

		if (!this.texture) {
			this._pendingReveal.push(lens)
		} else {
			lens._reveal()
		}
		return lens
	}

	/* ── Main render loop entry ────────────────────────────── */
	render(): void {
		const gl = this.gl
		if (!this.texture) return

		if (this._isScrolling) {
			this._scrollUpdateCounter++
		}

		gl.clearColor(0, 0, 0, 0)
		gl.clear(gl.COLOR_BUFFER_BIT)
		gl.useProgram(this.program)
		gl.activeTexture(gl.TEXTURE0)
		gl.bindTexture(gl.TEXTURE_2D, this.texture)
		gl.uniform1i(this.uniforms.tex, 0)

		const time = (Date.now() - this.startTime) / 1000
		gl.uniform1f(this.uniforms.time, time)

		this._updateDynamicVideos()

		this._updateDynamicNodes()

		for (const lens of this.lenses) {
			lens.updateMetrics()
			if (lens._mirrorActive && lens._mirrorClipUpdater) {
				lens._mirrorClipUpdater()
			}
			this._renderLens(lens)
		}

		for (const lens of this.lenses) {
			if (lens._mirrorActive && lens._mirrorCtx) {
				const mirrorCanvas = lens._mirror!
				if (
					mirrorCanvas.width !== this.canvas.width ||
					mirrorCanvas.height !== this.canvas.height
				) {
					mirrorCanvas.width = this.canvas.width
					mirrorCanvas.height = this.canvas.height
				}
				lens._mirrorCtx.drawImage(this.canvas, 0, 0)
			}
		}

		const dpr = Math.min(2, window.devicePixelRatio ?? 1)
		for (const lens of this.lenses) {
			if (lens._mirrorActive && lens.rectPx) {
				const { left, top, width, height } = lens.rectPx
				const expand = 2
				const clearX = Math.max(0, Math.round(left * dpr) - expand)
				const clearY = Math.max(0, Math.round(this.canvas.height - (top + height) * dpr) - expand)
				const clearW = Math.min(this.canvas.width - clearX, Math.round(width * dpr) + expand * 2)
				const clearH = Math.min(this.canvas.height - clearY, Math.round(height * dpr) + expand * 2)
				if (clearW > 0 && clearH > 0) {
					gl.enable(gl.SCISSOR_TEST)
					gl.scissor(clearX, clearY, clearW, clearH)
					gl.clearColor(0, 0, 0, 0)
					gl.clear(gl.COLOR_BUFFER_BIT)
					gl.disable(gl.SCISSOR_TEST)
				}
			}
		}
	}

	/* ── Render a single lens ──────────────────────────────── */
	private _renderLens(lens: LiquidGlassLens): void {
		const gl = this.gl
		const rect = lens.rectPx
		if (!rect) return

		const dpr = Math.min(2, window.devicePixelRatio ?? 1)

		let overscrollY = 0
		let overscrollX = 0

		if (window.visualViewport) {
			overscrollX = window.visualViewport.offsetLeft
			overscrollY = window.visualViewport.offsetTop
		}

		const viewportX = (rect.left + overscrollX) * dpr
		const viewportY = this.canvas.height - (rect.top + overscrollY + rect.height) * dpr
		const viewportW = rect.width * dpr
		const viewportH = rect.height * dpr

		gl.viewport(viewportX, viewportY, viewportW, viewportH)
		gl.uniform2f(this.uniforms.res, viewportW, viewportH)

		const docX = rect.left - this.snapshotTarget.getBoundingClientRect().left
		const docY = rect.top - this.snapshotTarget.getBoundingClientRect().top
		const leftUV = (docX * this.scaleFactor) / this.textureWidth
		const topUV = (docY * this.scaleFactor) / this.textureHeight
		const widthUV = (rect.width * this.scaleFactor) / this.textureWidth
		const heightUV = (rect.height * this.scaleFactor) / this.textureHeight
		gl.uniform4f(this.uniforms.bounds, leftUV, topUV, widthUV, heightUV)

		gl.uniform2f(this.uniforms.textureResolution, this.textureWidth, this.textureHeight)
		gl.uniform1f(this.uniforms.refraction, lens.options.refraction!)
		gl.uniform1f(this.uniforms.bevelDepth, lens.options.bevelDepth!)
		gl.uniform1f(this.uniforms.bevelWidth, lens.options.bevelWidth!)
		gl.uniform1f(this.uniforms.frost, lens.options.frost!)
		gl.uniform1f(this.uniforms.blur, Math.max(0, lens.options.blur ?? 0))
		gl.uniform1f(
			this.uniforms.progressiveBlurStrength,
			Math.max(0, lens.options.progressiveBlurStrength ?? 0),
		)
		gl.uniform1f(this.uniforms.radius, lens.radiusGl)
		gl.uniform1i(this.uniforms.specular, lens.options.specular ? 1 : 0)
		gl.uniform1f(
			this.uniforms.specularOpacity,
			Math.max(0, Math.min(1, lens.options.specularOpacity ?? 0.4)),
		)
		gl.uniform1f(
			this.uniforms.specularSaturation,
			Math.max(1, lens.options.specularSaturation ?? 6),
		)
		gl.uniform1f(this.uniforms.revealProgress, lens._revealProgress || 1.0)
		gl.uniform1i(this.uniforms.revealType, lens.revealTypeIndex || 0)

		const magnification = Math.max(0.001, Math.min(3.0, lens.options.magnify ?? 1.0))
		gl.uniform1f(this.uniforms.magnify, magnification)

		gl.uniform1f(this.uniforms.tiltX, lens.tiltX || 0)
		gl.uniform1f(this.uniforms.tiltY, lens.tiltY || 0)

		gl.drawArrays(gl.TRIANGLES, 0, 6)
	}

	/* ── Draw a rounded-rect path on a 2D context ──────────── */
	private _createRoundedRectPath(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		radii: BorderRadii,
	): void {
		ctx.beginPath()
		ctx.moveTo(radii.tl, 0)
		ctx.lineTo(width - radii.tr, 0)
		ctx.arcTo(width, 0, width, radii.tr, radii.tr)
		ctx.lineTo(width, height - radii.br)
		ctx.arcTo(width, height, width - radii.br, height, radii.br)
		ctx.lineTo(radii.bl, height)
		ctx.arcTo(0, height, 0, height - radii.bl, radii.bl)
		ctx.lineTo(0, radii.tl)
		ctx.arcTo(0, 0, radii.tl, 0, radii.tl)
		ctx.closePath()
	}

	/* ── Update video frames in the snapshot texture ───────── */
	private _updateDynamicVideos(): void {
		if (this._isScrolling && this._scrollUpdateCounter % 2 !== 0) return
		if (!this.texture || !this.staticSnapshotCanvas || !this._videoNodes.length) return
		const gl = this.gl

		const snapRect = this.snapshotTarget.getBoundingClientRect()

		const maxLensZ = this._getMaxLensZ()

		for (const videoElement of this._videoNodes) {
			if (effectiveZ(videoElement) >= maxLensZ) {
				continue
			}

			if (this._isIgnored(videoElement) || videoElement.readyState < 2) {
				continue
			}

			const rect = videoElement.getBoundingClientRect()
			const texX = (rect.left - snapRect.left) * this.scaleFactor
			const texY = (rect.top - snapRect.top) * this.scaleFactor
			const texW = rect.width * this.scaleFactor
			const texH = rect.height * this.scaleFactor

			const drawW = Math.round(texW)
			const drawH = Math.round(texH)

			if (drawW <= 0 || drawH <= 0) {
				continue
			}

			if (this._tmpCanvas.width !== drawW || this._tmpCanvas.height !== drawH) {
				this._tmpCanvas.width = drawW
				this._tmpCanvas.height = drawH
			}

			try {
				this._tmpCtx.save()
				this._tmpCtx.clearRect(0, 0, drawW, drawH)

				const style = window.getComputedStyle(videoElement)
				const scaledRadii: BorderRadii = {
					tl: parseFloat(style.borderTopLeftRadius) * this.scaleFactor,
					tr: parseFloat(style.borderTopRightRadius) * this.scaleFactor,
					br: parseFloat(style.borderBottomRightRadius) * this.scaleFactor,
					bl: parseFloat(style.borderBottomLeftRadius) * this.scaleFactor,
				}

				if (Object.values(scaledRadii).some((radius) => radius > 0)) {
					this._createRoundedRectPath(this._tmpCtx, drawW, drawH, scaledRadii)
					this._tmpCtx.clip()
				}

				this._tmpCtx.drawImage(
					this.staticSnapshotCanvas,
					texX,
					texY,
					texW,
					texH,
					0,
					0,
					drawW,
					drawH,
				)

				this._tmpCtx.drawImage(videoElement, 0, 0, drawW, drawH)
				this._tmpCtx.restore()
			} catch {
				continue
			}

			const drawX = Math.round(texX)
			const drawY = Math.round(texY)

			if (drawW <= 0 || drawH <= 0) {
				continue
			}

			const maxW = this.textureWidth
			const maxH = this.textureHeight
			let dstX = drawX
			let dstY = drawY
			let updW = drawW
			let updH = drawH

			if (dstX < 0) {
				updW += dstX
				dstX = 0
			}
			if (dstY < 0) {
				updH += dstY
				dstY = 0
			}

			if (dstX + updW > maxW) {
				updW = maxW - dstX
			}
			if (dstY + updH > maxH) {
				updH = maxH - dstY
			}

			if (updW <= 0 || updH <= 0) {
				continue
			}

			gl.bindTexture(gl.TEXTURE_2D, this.texture)
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
			gl.texSubImage2D(gl.TEXTURE_2D, 0, dstX, dstY, gl.RGBA, gl.UNSIGNED_BYTE, this._tmpCanvas)
		}
	}

	/* ── Update dynamic DOM nodes in the snapshot texture ───── */
	private _updateDynamicNodes(): void {
		if (this._isScrolling && this._scrollUpdateCounter % 2 !== 0) return
		const gl = this.gl
		if (!this.texture || !this._dynMeta) return
		const snapRect = this.snapshotTarget.getBoundingClientRect()
		const maxLensZ = this._getMaxLensZ()

		const lensRects = this.lenses.map((lens) => lens.rectPx).filter(Boolean) as LensRect[]

		this._compositeCtx ??= document.createElement('canvas').getContext('2d')!

		const compositeVideos = (
			compositeCtx: CanvasRenderingContext2D,
			dynamicElRect: DOMRect,
		): void => {
			for (const videoElement of this._videoNodes) {
				if (effectiveZ(videoElement) >= maxLensZ) {
					continue
				}
				const vidRect = videoElement.getBoundingClientRect()

				if (
					dynamicElRect.left < vidRect.right &&
					dynamicElRect.right > vidRect.left &&
					dynamicElRect.top < vidRect.bottom &&
					dynamicElRect.bottom > vidRect.top
				) {
					const xInComposite = (vidRect.left - dynamicElRect.left) * this.scaleFactor
					const yInComposite = (vidRect.top - dynamicElRect.top) * this.scaleFactor
					const wInComposite = vidRect.width * this.scaleFactor
					const hInComposite = vidRect.height * this.scaleFactor
					compositeCtx.drawImage(
						videoElement,
						xInComposite,
						yInComposite,
						wInComposite,
						hInComposite,
					)
				}
			}
		}

		for (const node of this._dynamicNodes) {
			const element = node.el
			const meta = this._dynMeta.get(element)
			if (!meta) {
				continue
			}

			if (meta.needsRecapture && !meta._capturing && !this._isScrolling) {
				meta._capturing = true

				toCanvas(element, {
					pixelRatio: this.scaleFactor,
					cacheBust: true,
					filter: (node: Node) => {
						const el = node as Element
						return !(el.tagName === 'CANVAS' || el.hasAttribute?.('data-liquid-ignore'))
					},
				})
					.then((capturedCanvas) => {
						if (capturedCanvas.width > 0 && capturedCanvas.height > 0) {
							meta.lastCapture = capturedCanvas
							meta.needsRecapture = false
						}
					})
					.catch((error) => {
						/* oxlint-disable-next-line no-console -- WebGL diagnostic */
						console.error('liquidGL: Dynamic element capture failed.', error)
					})
					.finally(() => {
						meta._capturing = false
					})
			}

			if (meta.lastCapture) {
				if (meta.prevDrawRect && !(this._workerEnabled && meta._heavyAnim)) {
					const { x, y, w, h } = meta.prevDrawRect
					if (w > 0 && h > 0) {
						const eraseCanvas = this._compositeCtx.canvas
						if (eraseCanvas.width !== w || eraseCanvas.height !== h) {
							eraseCanvas.width = w
							eraseCanvas.height = h
						}
						this._compositeCtx.drawImage(this.staticSnapshotCanvas!, x, y, w, h, 0, 0, w, h)
						gl.bindTexture(gl.TEXTURE_2D, this.texture)
						gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, eraseCanvas)
					}
				}

				const rect = element.getBoundingClientRect()
				if (
					effectiveZ(element) >= maxLensZ ||
					!document.contains(element) ||
					rect.width === 0 ||
					rect.height === 0
				) {
					meta.prevDrawRect = null
					continue
				}

				if (!lensRects.some((lensRect) => rectsIntersect(rect, lensRect))) {
					meta.prevDrawRect = null
					continue
				}

				const texX = (rect.left - snapRect.left) * this.scaleFactor
				const texY = (rect.top - snapRect.top) * this.scaleFactor
				const drawW = Math.round(rect.width * this.scaleFactor)
				const drawH = Math.round(rect.height * this.scaleFactor)
				const drawX = Math.round(texX)
				const drawY = Math.round(texY)

				if (drawW <= 0 || drawH <= 0) {
					continue
				}

				const maxW = this.textureWidth
				const maxH = this.textureHeight
				let dstX = drawX
				let dstY = drawY
				let updW = drawW
				let updH = drawH

				if (dstX < 0) {
					updW += dstX
					dstX = 0
				}
				if (dstY < 0) {
					updH += dstY
					dstY = 0
				}

				if (dstX + updW > maxW) {
					updW = maxW - dstX
				}
				if (dstY + updH > maxH) {
					updH = maxH - dstY
				}

				if (updW <= 0 || updH <= 0) {
					continue
				}

				const compositeCanvas = this._compositeCtx.canvas
				if (compositeCanvas.width !== drawW || compositeCanvas.height !== drawH) {
					compositeCanvas.width = drawW
					compositeCanvas.height = drawH
				}
				this._compositeCtx.clearRect(0, 0, drawW, drawH)

				this._compositeCtx.drawImage(
					this.staticSnapshotCanvas!,
					texX,
					texY,
					rect.width * this.scaleFactor,
					rect.height * this.scaleFactor,
					0,
					0,
					drawW,
					drawH,
				)
				compositeVideos(this._compositeCtx, rect)

				const style = window.getComputedStyle(element)
				this._compositeCtx.save()
				this._compositeCtx.translate(drawW / 2, drawH / 2)
				if (style.transform !== 'none') {
					const transformValues = this._parseTransform(style.transform)
					this._compositeCtx.transform(
						transformValues[0],
						transformValues[1],
						transformValues[2],
						transformValues[3],
						transformValues[4],
						transformValues[5],
					)
				}
				this._compositeCtx.translate(-drawW / 2, -drawH / 2)
				this._compositeCtx.globalAlpha = parseFloat(style.opacity) ?? 1
				this._compositeCtx.drawImage(meta.lastCapture, 0, 0, drawW, drawH)
				this._compositeCtx.restore()

				gl.bindTexture(gl.TEXTURE_2D, this.texture)
				gl.texSubImage2D(gl.TEXTURE_2D, 0, dstX, dstY, gl.RGBA, gl.UNSIGNED_BYTE, compositeCanvas)

				if (this._workerEnabled && meta._heavyAnim) {
					const jobId = `${Date.now()}_${Math.random()}`
					this._dynJobs!.set(jobId, {
						x: dstX,
						y: dstY,
						w: updW,
						h: updH,
					})

					void Promise.all([
						createImageBitmap(this.staticSnapshotCanvas!, dstX, dstY, updW, updH),
						createImageBitmap(meta.lastCapture),
					]).then(([snapBitmap, dynBitmap]) => {
						this._dynWorker!.postMessage(
							{
								id: jobId,
								width: updW,
								height: updH,
								snap: snapBitmap,
								dyn: dynBitmap,
							},
							[snapBitmap, dynBitmap],
						)
					})
					meta.prevDrawRect = { x: dstX, y: dstY, w: updW, h: updH }
					continue
				}

				meta.prevDrawRect = { x: dstX, y: dstY, w: updW, h: updH }
			}
		}
	}

	private _parseTransform(transform: string): [number, number, number, number, number, number] {
		if (transform === 'none') return [1, 0, 0, 1, 0, 0]
		const matrixMatch = transform.match(/matrix\((.+)\)/)
		if (matrixMatch) {
			const values = matrixMatch[1].split(',').map(parseFloat)
			return values as [number, number, number, number, number, number]
		}
		const matrix3dMatch = transform.match(/matrix3d\((.+)\)/)
		if (matrix3dMatch) {
			const values = matrix3dMatch[1].split(',').map(parseFloat)
			return [values[0], values[1], values[4], values[5], values[12], values[13]]
		}
		return [1, 0, 0, 1, 0, 0]
	}

	/* ── Get the highest z-index among lenses ──────────────── */
	private _getMaxLensZ(): number {
		let maxZ = 0
		for (const lens of this.lenses) {
			const zValue = effectiveZ(lens.el)
			if (zValue > maxZ) {
				maxZ = zValue
			}
		}
		return maxZ
	}

	/* ── Register a dynamic element for live updates ───────── */
	addDynamicElement(elementOrSelector: HTMLElement | string | NodeList | HTMLElement[]): void {
		if (!elementOrSelector) {
			return
		}
		if (typeof elementOrSelector === 'string') {
			for (const node of this.snapshotTarget.querySelectorAll<HTMLElement>(elementOrSelector)) {
				this.addDynamicElement(node)
			}
			return
		}
		if (NodeList.prototype.isPrototypeOf(elementOrSelector) || Array.isArray(elementOrSelector)) {
			for (const node of elementOrSelector as NodeListOf<HTMLElement>) {
				this.addDynamicElement(node)
			}
			return
		}
		const element = elementOrSelector as HTMLElement
		if (!element.getBoundingClientRect) return
		if (element.closest && element.closest('[data-liquid-ignore]')) return
		if (this._dynamicNodes.some((node) => node.el === element)) return

		this._dynamicNodes = this._dynamicNodes.filter((node) => !element.contains(node.el))

		const meta: DynamicMeta = {
			_capturing: false,
			prevDrawRect: null,
			lastCapture: null,
			needsRecapture: true,
			hoverClassName: null,
			_animating: false,
			_rafId: null,
			_lastCaptureTs: 0,
			_heavyAnim: false,
		}
		this._dynMeta.set(element, meta)

		const setDirty = (): void => {
			const currentMeta = this._dynMeta.get(element)
			if (currentMeta && !currentMeta.needsRecapture) {
				currentMeta.needsRecapture = true
				requestAnimationFrame(() => this.render())
			}
		}

		const handleLeave = (): void => {
			const currentMeta = this._dynMeta.get(element)
			if (!currentMeta?.hoverClassName) return

			element.classList.remove(currentMeta.hoverClassName)
			for (let i = this._dynamicStyleSheet.cssRules.length - 1; i >= 0; i--) {
				const rule = this._dynamicStyleSheet.cssRules[i] as CSSStyleRule
				if (rule.selectorText === `.${currentMeta.hoverClassName}`) {
					this._dynamicStyleSheet.deleteRule(i)
					break
				}
			}
			currentMeta.hoverClassName = null
			setDirty()
		}

		element.addEventListener(
			'mouseenter',
			() => {
				const currentMeta = this._dynMeta.get(element)
				if (!currentMeta) return
				const hoverCss = findAppliedHoverStyles(element)
				if (hoverCss) {
					const className = `lqgl-h-${Math.random().toString(36).substr(2, 9)}`
					const ruleText = `.${className} { ${hoverCss} }`
					try {
						this._dynamicStyleSheet.insertRule(ruleText, this._dynamicStyleSheet.cssRules.length)
						currentMeta.hoverClassName = className
						element.classList.add(className)
					} catch (error) {
						/* oxlint-disable-next-line no-console -- WebGL diagnostic */
						console.error('liquidGL: Failed to insert hover style rule.', error)
					}
				}
				setDirty()
			},
			{ passive: true },
		)

		element.addEventListener('mouseleave', handleLeave, { passive: true })
		element.addEventListener('transitionend', setDirty, { passive: true })

		const startRealtime = (): void => {
			const currentMeta = this._dynMeta.get(element)
			if (!currentMeta || currentMeta._animating) return
			currentMeta._animating = true

			currentMeta._heavyAnim = false

			const step = (timestamp: number): void => {
				const stepMeta = this._dynMeta.get(element)
				if (!stepMeta?._animating) return

				if (
					stepMeta._heavyAnim &&
					!stepMeta._capturing &&
					timestamp - stepMeta._lastCaptureTs > 33
				) {
					stepMeta._lastCaptureTs = timestamp
					stepMeta.needsRecapture = true
				}
				if (stepMeta._heavyAnim) {
					stepMeta._rafId = requestAnimationFrame(step)
				} else {
					stepMeta._rafId = null
				}
			}
			currentMeta._rafId = requestAnimationFrame(step)
		}

		const trackProperty = (property: string): void => {
			const currentMeta = this._dynMeta.get(element)
			if (!currentMeta) return
			const lowered = (property || '').toLowerCase()
			if (!(lowered.includes('transform') || lowered.includes('opacity'))) {
				const wasHeavy = currentMeta._heavyAnim
				currentMeta._heavyAnim = true
				if (currentMeta._animating && !wasHeavy && !currentMeta._rafId) {
					currentMeta._animating = false
					startRealtime()
				}
			}
		}

		const transitionRunHandler = (event: TransitionEvent): void => {
			trackProperty(event.propertyName)
			startRealtime()
		}

		element.addEventListener('transitionrun', transitionRunHandler, {
			passive: true,
		})
		element.addEventListener('transitionstart', transitionRunHandler, {
			passive: true,
		})
		element.addEventListener(
			'animationstart',
			() => {
				const currentMeta = this._dynMeta.get(element)
				if (currentMeta) currentMeta._heavyAnim = true
				startRealtime()
			},
			{ passive: true },
		)

		element.addEventListener(
			'animationiteration',
			() => {
				const currentMeta = this._dynMeta.get(element)
				if (currentMeta) {
					currentMeta._heavyAnim = true
					if (!currentMeta._animating) startRealtime()
				}
			},
			{ passive: true },
		)

		const stopRealtime = (): void => {
			const currentMeta = this._dynMeta.get(element)
			if (!currentMeta?._animating) return
			currentMeta._animating = false
			if (currentMeta._rafId) {
				cancelAnimationFrame(currentMeta._rafId)
				currentMeta._rafId = null
			}
			currentMeta._heavyAnim = false
			setDirty()
		}

		element.addEventListener('transitionend', stopRealtime, {
			passive: true,
		})
		element.addEventListener('transitioncancel', stopRealtime, {
			passive: true,
		})
		element.addEventListener('animationend', stopRealtime, {
			passive: true,
		})
		element.addEventListener('animationcancel', stopRealtime, {
			passive: true,
		})

		/* Removal clean-up via MutationObserver */
		if (typeof MutationObserver !== 'undefined') {
			const removalObserver = new MutationObserver(() => {
				if (!document.contains(element)) {
					handleLeave()
					removalObserver.disconnect()
					this._dynamicNodes = this._dynamicNodes.filter((node) => node.el !== element)
					this._dynMeta.delete(element)
				}
			})
			removalObserver.observe(document.body, {
				childList: true,
				subtree: true,
			})
		}

		this._dynamicNodes.push({ el: element })
	}

	/* ── Check if an element has the data-liquid-ignore attr ── */
	private _isIgnored(element: HTMLElement): boolean {
		return !!(
			element &&
			typeof element.closest === 'function' &&
			element.closest('[data-liquid-ignore]')
		)
	}
}

/* ── Per-element lens wrapper ────────────────────────────────── */

export class LiquidGlassLens {
	renderer: LiquidGlassRenderer
	el: HTMLElement
	options: LensOptions
	rectPx: LensRect | null
	radiusGl: number
	radiusCss: number
	revealTypeIndex: number
	_revealProgress: number
	tiltX: number
	tiltY: number

	originalShadow: string
	originalOpacity: string
	originalTransition: string

	_bgColorComponents: {
		r: number
		g: number
		b: number
		a: number
	} | null

	_initCalled: boolean
	_shadowEl: HTMLDivElement | null
	_shadowSyncFn: (() => void) | null
	_sizeObs: ResizeObserver | null

	/* Tilt state */
	_tiltHandlersBound: boolean
	_tiltInteracting: boolean
	_tiltActive: boolean
	_savedTransform: string | undefined
	_savedTransformStyle: string | undefined
	_pivotOrigin: string | undefined
	_resetCleanupTimer: ReturnType<typeof setTimeout> | null

	_applyTilt: ((clientX: number, clientY: number) => void) | null
	_smoothReset: (() => void) | null
	_onMouseEnter: ((event: MouseEvent | { clientX: number; clientY: number }) => void) | null
	_onMouseMove: ((event: MouseEvent) => void) | null
	_onTouchStart: ((event: TouchEvent) => void) | null
	_onTouchMove: ((event: TouchEvent) => void) | null
	_onTouchEnd: (() => void) | null
	_docPointerMove: ((event: PointerEvent) => void) | null
	_boundCheckLeave: ((event: MouseEvent) => void) | null

	/* Mirror state */
	_mirror: HTMLCanvasElement | null
	_mirrorCtx: CanvasRenderingContext2D | null
	_mirrorActive: boolean
	_mirrorClipUpdater: (() => void) | null
	_baseRect: DOMRect | null

	/* Overscroll compensation state */
	_currentOverscrollX: number
	_currentOverscrollY: number

	constructor(renderer: LiquidGlassRenderer, element: HTMLElement, options: LensOptions) {
		this.renderer = renderer
		this.el = element
		this.options = options
		this._initCalled = false
		this.rectPx = null
		this.radiusGl = 0
		this.radiusCss = 0
		this.revealTypeIndex = this.options.reveal === 'fade' ? 1 : 0
		this._revealProgress = this.revealTypeIndex === 0 ? 1 : 0
		this.tiltX = 0
		this.tiltY = 0

		this._shadowEl = null
		this._shadowSyncFn = null
		this._sizeObs = null

		this._tiltHandlersBound = false
		this._tiltInteracting = false
		this._tiltActive = false
		this._resetCleanupTimer = null
		this._applyTilt = null
		this._smoothReset = null
		this._onMouseEnter = null
		this._onMouseMove = null
		this._onTouchStart = null
		this._onTouchMove = null
		this._onTouchEnd = null
		this._docPointerMove = null
		this._boundCheckLeave = null

		this._mirror = null
		this._mirrorCtx = null
		this._mirrorActive = false
		this._mirrorClipUpdater = null
		this._baseRect = null

		this._currentOverscrollX = 0
		this._currentOverscrollY = 0

		this.originalShadow = this.el.style.boxShadow
		this.originalOpacity = this.el.style.opacity
		this.originalTransition = this.el.style.transition
		this.el.style.transition = 'none'
		this.el.style.opacity = '0'

		this.el.style.position =
			this.el.style.position === 'static' ? 'relative' : this.el.style.position

		const bgColor = window.getComputedStyle(this.el).backgroundColor
		const rgbaMatch = bgColor.match(/rgba?\(([^)]+)\)/)
		this._bgColorComponents = null
		if (rgbaMatch) {
			const components = rgbaMatch[1].split(/[ ,]+/).map(parseFloat)
			const [r, g, b, a = 1] = components
			this._bgColorComponents = { r, g, b, a }
			this.el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0)`
		}

		this.el.style.backdropFilter = 'none'
		;(
			this.el.style as CSSStyleDeclaration & { webkitBackdropFilter: string }
		).webkitBackdropFilter = 'none'
		this.el.style.backgroundImage = 'none'
		this.el.style.background = 'transparent'

		this.el.style.pointerEvents = 'none'

		this.updateMetrics()
		this.setShadow(this.options.shadow!)
		if (this.options.tilt) this._bindTiltHandlers()

		if (typeof ResizeObserver !== 'undefined' && !this._sizeObs) {
			this._sizeObs = new ResizeObserver(() => {
				this.updateMetrics()
				this.renderer.render()
			})
			this._sizeObs.observe(this.el)
		}
	}

	/* ── Update element metrics (position, border radius) ──── */
	updateMetrics(): void {
		const rect =
			this._mirrorActive && this._baseRect ? this._baseRect : this.el.getBoundingClientRect()

		this.rectPx = {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		}

		const style = window.getComputedStyle(this.el)
		const borderRadiusRaw = style.borderTopLeftRadius.split(' ')[0]
		const isPercent = borderRadiusRaw.trim().endsWith('%')
		let borderRadiusPx: number
		if (isPercent) {
			const pct = parseFloat(borderRadiusRaw)
			borderRadiusPx = (Math.min(rect.width, rect.height) * pct) / 100
		} else {
			borderRadiusPx = parseFloat(borderRadiusRaw)
		}
		const maxAllowedCss = Math.min(rect.width, rect.height) * 0.5
		this.radiusCss = Math.min(borderRadiusPx, maxAllowedCss)

		const dpr = Math.min(2, window.devicePixelRatio ?? 1)
		this.radiusGl = this.radiusCss * dpr

		if (this._shadowSyncFn) {
			this._shadowSyncFn()
		}
	}

	/* ── Compensate for iOS rubber-band overscroll ──────────── */
	// Public: consumers may call this from external scroll/viewport handlers.
	handleOverscrollCompensation(): void {
		let overscrollY = 0
		let overscrollX = 0

		if (window.visualViewport) {
			overscrollX = -window.visualViewport.offsetLeft
			overscrollY = -window.visualViewport.offsetTop
		} else {
			const bodyStyle = window.getComputedStyle(document.body)
			const htmlStyle = window.getComputedStyle(document.documentElement)

			if (bodyStyle.transform && bodyStyle.transform !== 'none') {
				const matrix = new DOMMatrix(bodyStyle.transform)
				overscrollX = matrix.m41
				overscrollY = matrix.m42
			}

			if (
				overscrollY === 0 &&
				overscrollX === 0 &&
				htmlStyle.transform &&
				htmlStyle.transform !== 'none'
			) {
				const matrix = new DOMMatrix(htmlStyle.transform)
				overscrollX = matrix.m41
				overscrollY = matrix.m42
			}
		}

		this._currentOverscrollX = overscrollX
		this._currentOverscrollY = overscrollY

		if (overscrollY !== 0 || overscrollX !== 0) {
			const compensationTransform = `translate(${-overscrollX}px, ${-overscrollY}px)`

			let currentTransform = this.el.style.transform
			currentTransform = currentTransform.replaceAll(/translate\([^)]*\)\s*/g, '').trim()

			this.el.style.transform =
				compensationTransform + (currentTransform ? ' ' + currentTransform : '')

			if (this._shadowEl) {
				let shadowTransform = this._shadowEl.style.transform || ''
				shadowTransform = shadowTransform.replaceAll(/translate\([^)]*\)\s*/g, '').trim()
				this._shadowEl.style.transform =
					compensationTransform + (shadowTransform ? ' ' + shadowTransform : '')
			}
		} else if (!this._tiltInteracting) {
			this.el.style.transform = this._savedTransform || ''
			if (this._shadowEl) {
				this._shadowEl.style.transform = ''
			}
		}
	}

	/* ── Enable or disable tilt ────────────────────────────── */
	setTilt(enabled: boolean): void {
		this.options.tilt = !!enabled
		if (this.options.tilt) {
			this._bindTiltHandlers()
		} else {
			this._unbindTiltHandlers()
		}
	}

	/* ── Enable or disable shadow ──────────────────────────── */
	setShadow(enabled: boolean): void {
		this.options.shadow = !!enabled

		const SHADOW_VAL = '0 10px 30px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.05)'

		const syncShadow = (): void => {
			if (!this._shadowEl) return
			const rect =
				this._mirrorActive && this._baseRect ? this._baseRect : this.el.getBoundingClientRect()
			this._shadowEl.style.left = `${rect.left}px`
			this._shadowEl.style.top = `${rect.top}px`
			this._shadowEl.style.width = `${rect.width}px`
			this._shadowEl.style.height = `${rect.height}px`
			this._shadowEl.style.borderRadius = `${this.radiusCss}px`
		}

		if (enabled) {
			this.el.style.boxShadow = SHADOW_VAL

			if (!this._shadowEl) {
				this._shadowEl = document.createElement('div')
				Object.assign(this._shadowEl.style, {
					position: 'fixed',
					pointerEvents: 'none',
					zIndex: String(effectiveZ(this.el) - 2),
					boxShadow: SHADOW_VAL,
					willChange: 'transform, width, height',
					opacity: this.revealTypeIndex === 1 ? '0' : '1',
				})
				document.body.appendChild(this._shadowEl)

				this._shadowSyncFn = syncShadow
				window.addEventListener('resize', this._shadowSyncFn, {
					passive: true,
				})
			}
			syncShadow()
		} else {
			if (this._shadowEl) {
				window.removeEventListener('resize', this._shadowSyncFn!)
				this._shadowEl.remove()
				this._shadowEl = null
			}
			this.el.style.boxShadow = this.originalShadow
		}
	}

	/* ── Reveal animation (called after texture is ready) ──── */
	_reveal(): void {
		if (this.revealTypeIndex === 0) {
			this.el.style.opacity = this.originalOpacity ?? '1'
			this.renderer.canvas.style.opacity = '1'
			this._revealProgress = 1
			this._triggerInit()
			return
		}

		if (this.renderer._revealAnimating) return

		this.renderer._revealAnimating = true

		const duration = 1000
		const startTimestamp = performance.now()

		const animate = (): void => {
			const progress = Math.min(1, (performance.now() - startTimestamp) / duration)

			for (const lens of this.renderer.lenses) {
				lens._revealProgress = progress
				lens.el.style.opacity = String((parseFloat(lens.originalOpacity) || 1) * progress)
				if (lens._shadowEl) {
					lens._shadowEl.style.opacity = String(progress)
				}
			}

			this.renderer.canvas.style.opacity = String(progress)

			this.renderer.render()

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.renderer._revealAnimating = false
				for (const lens of this.renderer.lenses) {
					lens.el.style.transition = lens.originalTransition || ''
					lens._triggerInit()
				}
			}
		}

		requestAnimationFrame(animate)
	}

	/* ── Bind tilt interaction handlers ────────────────────── */
	private _bindTiltHandlers(): void {
		if (this._tiltHandlersBound) return

		if (this._savedTransform === undefined) {
			const currentTransform = this.el.style.transform
			if (currentTransform && currentTransform.includes('translate')) {
				this._savedTransform = currentTransform.replaceAll(/translate\([^)]*\)\s*/g, '').trim()
				if (this._savedTransform === '') this._savedTransform = 'none'
			} else {
				this._savedTransform = currentTransform
			}
		}
		if (this._savedTransformStyle === undefined) {
			this._savedTransformStyle = this.el.style.transformStyle
		}
		this.el.style.transformStyle = 'preserve-3d'

		const getMaxTilt = (): number =>
			Number.isFinite(this.options.tiltFactor) ? this.options.tiltFactor! : 5

		this._applyTilt = (clientX: number, clientY: number): void => {
			if (!this._tiltInteracting) {
				this._tiltInteracting = true
				this.el.style.transition = 'transform 0.12s cubic-bezier(0.33,1,0.68,1)'
				this._createMirrorCanvas()
				if (this._mirror) {
					this._mirror.style.transition = 'transform 0.12s cubic-bezier(0.33,1,0.68,1)'
				}
				if (this._shadowEl) {
					this._shadowEl.style.transition = 'transform 0.12s cubic-bezier(0.33,1,0.68,1)'
				}
			}

			const rect = this._baseRect || this.el.getBoundingClientRect()
			const centerX = rect.left + rect.width / 2
			const centerY = rect.top + rect.height / 2

			this._pivotOrigin = `${centerX}px ${centerY}px`

			const percentX = (clientX - centerX) / (rect.width / 2)
			const percentY = (clientY - centerY) / (rect.height / 2)
			const maxTilt = getMaxTilt()
			const rotateY = percentX * maxTilt
			const rotateX = -percentY * maxTilt
			const baseTransform =
				this._savedTransform && this._savedTransform !== 'none' ? this._savedTransform + ' ' : ''

			let overscrollCompensation = ''
			const bodyStyle = window.getComputedStyle(document.body)
			if (bodyStyle.transform && bodyStyle.transform !== 'none') {
				const matrix = new DOMMatrix(bodyStyle.transform)
				const bodyOverscrollX = matrix.m41
				const bodyOverscrollY = matrix.m42
				if (bodyOverscrollX !== 0 || bodyOverscrollY !== 0) {
					overscrollCompensation = `translate(${-bodyOverscrollX}px, ${-bodyOverscrollY}px) `
				}
			}

			const transformStr = `${overscrollCompensation}${baseTransform}perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

			this.tiltX = rotateX
			this.tiltY = rotateY

			this.el.style.transformOrigin = `50% 50%`
			this.el.style.transform = transformStr

			if (this._mirror) {
				this._mirror.style.transformOrigin = this._pivotOrigin
				this._mirror.style.transform = transformStr
			}

			if (this._shadowEl) {
				this._shadowEl.style.transformOrigin = `50% 50%`
				this._shadowEl.style.transform = transformStr
			}

			this.renderer.render()
		}

		this._smoothReset = (): void => {
			this.el.style.transition = 'transform 0.4s cubic-bezier(0.33,1,0.68,1)'
			this.el.style.transformOrigin = `50% 50%`
			const baseRest =
				this._savedTransform && this._savedTransform !== 'none' ? this._savedTransform + ' ' : ''

			let overscrollCompensation = ''
			const bodyStyle = window.getComputedStyle(document.body)
			if (bodyStyle.transform && bodyStyle.transform !== 'none') {
				const matrix = new DOMMatrix(bodyStyle.transform)
				const bodyOverscrollX = matrix.m41
				const bodyOverscrollY = matrix.m42
				if (bodyOverscrollX !== 0 || bodyOverscrollY !== 0) {
					overscrollCompensation = `translate(${-bodyOverscrollX}px, ${-bodyOverscrollY}px) `
				}
			}

			this.el.style.transform = `${overscrollCompensation}${baseRest}perspective(800px) rotateX(0deg) rotateY(0deg)`

			this.tiltX = 0
			this.tiltY = 0
			this.renderer.render()

			if (this._mirror) {
				this._mirror.style.transition = 'transform 0.4s cubic-bezier(0.33, 1, 0.68, 1)'
				this._mirror.style.transformOrigin = this._pivotOrigin || '50% 50%'
				this._mirror.style.transform = `${baseRest}perspective(800px) rotateX(0deg) rotateY(0deg)`
				const cleanupMirror = (): void => {
					this._destroyMirrorCanvas()
					this._resetCleanupTimer = null
				}
				this._mirror.addEventListener('transitionend', cleanupMirror, {
					once: true,
				})
				this._resetCleanupTimer = setTimeout(cleanupMirror, 350)
			}

			if (this._shadowEl) {
				this._shadowEl.style.transition = 'transform 0.4s cubic-bezier(0.33,1,0.68,1)'
				this._shadowEl.style.transformOrigin = `50% 50%`
				this._shadowEl.style.transform = `${baseRest}perspective(800px) rotateX(0deg) rotateY(0deg)`
			}
		}

		this._onMouseEnter = (event: MouseEvent | { clientX: number; clientY: number }): void => {
			if (this._resetCleanupTimer) {
				clearTimeout(this._resetCleanupTimer)
				this._resetCleanupTimer = null
				this._destroyMirrorCanvas()
				this.el.style.transition = 'none'
				this.el.style.transform = this._savedTransform || ''
				void this.el.offsetHeight
			}

			this._tiltInteracting = false
			this._createMirrorCanvas()

			const rect = this._baseRect || this.el.getBoundingClientRect()
			const centerX = rect.left + rect.width / 2
			const centerY = rect.top + rect.height / 2

			this._applyTilt!(centerX, centerY)

			if (event && typeof event.clientX === 'number') {
				requestAnimationFrame(() => {
					this._applyTilt!(event.clientX, event.clientY)
				})
			}

			document.addEventListener('mousemove', this._boundCheckLeave!, {
				passive: true,
			})
		}

		this._onMouseMove = (event: MouseEvent): void => this._applyTilt!(event.clientX, event.clientY)

		this._onTouchStart = (event: TouchEvent): void => {
			this._tiltInteracting = false
			this._createMirrorCanvas()
			if (event.touches?.length === 1) {
				const touch = event.touches[0]
				this._applyTilt!(touch.clientX, touch.clientY)
			}
		}
		this._onTouchMove = (event: TouchEvent): void => {
			if (event.touches?.length === 1) {
				const touch = event.touches[0]
				this._applyTilt!(touch.clientX, touch.clientY)
			}
		}
		this._onTouchEnd = (): void => {
			this._smoothReset!()
		}

		this.el.addEventListener('mouseenter', this._onMouseEnter.bind(this) as EventListener, {
			passive: true,
		})
		this.el.addEventListener('mousemove', this._onMouseMove.bind(this) as EventListener, {
			passive: true,
		})
		this.el.addEventListener('touchstart', this._onTouchStart.bind(this) as EventListener, {
			passive: true,
		})
		this.el.addEventListener('touchmove', this._onTouchMove.bind(this) as EventListener, {
			passive: true,
		})
		this.el.addEventListener('touchend', this._onTouchEnd.bind(this) as EventListener, {
			passive: true,
		})

		this._tiltActive = false

		this._docPointerMove = (event: PointerEvent): void => {
			const pointerX = event.clientX ?? (event as unknown as TouchEvent).touches?.[0]?.clientX
			const pointerY = event.clientY ?? (event as unknown as TouchEvent).touches?.[0]?.clientY
			if (pointerX === undefined || pointerY === undefined) return

			const rect = this.el.getBoundingClientRect()
			const inside =
				pointerX >= rect.left &&
				pointerX <= rect.right &&
				pointerY >= rect.top &&
				pointerY <= rect.bottom

			if (inside) {
				if (!this._tiltActive) {
					this._tiltActive = true
					this._onMouseEnter!({
						clientX: pointerX,
						clientY: pointerY,
					})
				} else {
					this._applyTilt!(pointerX, pointerY)
				}
			} else if (this._tiltActive) {
				this._tiltActive = false
				this._smoothReset!()
			}
		}

		document.addEventListener('pointermove', this._docPointerMove, {
			passive: true,
		})

		this._tiltHandlersBound = true
	}

	private _unbindTiltHandlers(): void {
		if (!this._tiltHandlersBound) return
		this.el.removeEventListener('mouseenter', this._onMouseEnter!.bind(this) as EventListener)
		this.el.removeEventListener('mousemove', this._onMouseMove!.bind(this) as EventListener)
		document.removeEventListener('mousemove', this._boundCheckLeave as EventListener)
		this.el.removeEventListener('touchstart', this._onTouchStart!.bind(this) as EventListener)
		this.el.removeEventListener('touchmove', this._onTouchMove!.bind(this) as EventListener)
		this.el.removeEventListener('touchend', this._onTouchEnd!.bind(this) as EventListener)

		if (this._docPointerMove) {
			document.removeEventListener('pointermove', this._docPointerMove)
			this._docPointerMove = null
		}
		this._tiltHandlersBound = false

		this.el.style.transform = this._savedTransform ?? ''
		this.el.style.transformStyle = this._savedTransformStyle ?? ''

		this.renderer.render()
	}

	private _createMirrorCanvas(): void {
		this._baseRect = this.el.getBoundingClientRect()
		if (this._mirror) return
		this._mirror = document.createElement('canvas')
		Object.assign(this._mirror.style, {
			position: 'fixed',
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
			pointerEvents: 'none',
			zIndex: String(effectiveZ(this.el) - 1),
			willChange: 'transform',
		})
		this._mirrorCtx = this._mirror.getContext('2d')
		document.body.appendChild(this._mirror)

		const updateClip = (): void => {
			if (this._mirrorActive) {
				this._baseRect = this._baseRect || this.el.getBoundingClientRect()
			}
			const rect = this._baseRect || this.el.getBoundingClientRect()
			const radius = `${this.radiusCss}px`
			const clipPath = `inset(${rect.top}px ${
				innerWidth - rect.right
			}px ${innerHeight - rect.bottom}px ${rect.left}px round ${radius})`
			this._mirror!.style.clipPath = clipPath
			;(this._mirror!.style as CSSStyleDeclaration & { webkitClipPath: string }).webkitClipPath =
				clipPath
		}
		updateClip()
		this._mirrorClipUpdater = updateClip
		window.addEventListener('resize', updateClip, { passive: true })

		this._mirrorActive = true
	}

	private _destroyMirrorCanvas(): void {
		if (!this._mirror) return
		window.removeEventListener('resize', this._mirrorClipUpdater!)
		this._mirror.remove()
		this._mirror = null
		this._mirrorCtx = null
		this._baseRect = null
		this._mirrorActive = false
	}

	private _triggerInit(): void {
		if (this._initCalled) return
		this._initCalled = true
		if (this.options.on?.init) {
			this.options.on.init(this)
		}
	}
}

/* ── Default lens options ────────────────────────────────────── */

export const DEFAULT_LENS_OPTIONS: Required<Omit<LensOptions, 'on'>> & {
	on: LensEventCallbacks
} = {
	target: '.liquidGL',
	snapshot: 'body',
	resolution: 2.0,
	refraction: 0.01,
	bevelDepth: 0.08,
	bevelWidth: 0.15,
	frost: 0,
	blur: 0,
	progressiveBlurStrength: 0,
	shadow: true,
	specular: true,
	specularOpacity: 0.4,
	specularSaturation: 6,
	reveal: 'fade',
	tilt: false,
	tiltFactor: 5,
	magnify: 1,
	continuous: true,
	on: {},
} as const

/* ── WebGL availability test ─────────────────────────────────── */

let webglAvailable: boolean | null = null

export function isWebGLAvailable(): boolean {
	if (webglAvailable !== null) return webglAvailable
	const testCanvas = document.createElement('canvas')
	const testCtx =
		testCanvas.getContext('webgl2') ??
		testCanvas.getContext('webgl') ??
		testCanvas.getContext('experimental-webgl')
	webglAvailable = !!testCtx
	return webglAvailable
}

/* ── SVG liquid glass API (ported from kube.io two-stage approach) ── */

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

const SURFACE_FNS: Record<BezelType, (x: number) => number> = {
	convex_circle: (x) => Math.sqrt(1 - (1 - x) ** 2),
	convex_squircle: (x) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4),
	concave: (x) => 1 - Math.sqrt(1 - (1 - x) ** 2),
}

/* Stage 1: pre-compute a 1D displacement profile along the bezel width */
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

/* Stage 2: rasterize the 1D profile into a 2D rounded-rect displacement map */
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

	/* Fill neutral displacement (R=128, G=128, B=0, A=255) */
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

			/* Anti-aliased opacity at the outer pill boundary */
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

/* Specular highlight: thin directional ring at the outer bezel edge */
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

/**
 * Detect Chromium-based browsers.
 *
 * Only Chromium currently supports `backdrop-filter: url(#svg-filter)`.
 */
export function isChromium(): boolean {
	if (typeof navigator === 'undefined') {
		return false
	}
	return /Chrome\/\d+/.test(navigator.userAgent)
}
