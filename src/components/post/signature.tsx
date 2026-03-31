/* src/components/post/signature.tsx */

/* oxlint-disable no-await-in-loop */

import { useEffect, useRef, useCallback } from 'react'

// timing
const drawSpeed = 1800 // px/s for normal strokes
const dotDrawSpeed = 300 // px/s for i dot (slower)
const eraseSpeed = 2400 // px/s
const holdMs = 5000
const pauseMs = 1500

// index of the "i dot" path
const dotIndex = 1

function animatePath(
  path: SVGPathElement,
  from: number,
  to: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - (1 - t) ** 3 // ease-out cubic
      path.style.strokeDashoffset = `${from + (to - from) * eased}`
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function Signature({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const activeRef = useRef(false)

  const startLoop = useCallback(async () => {
    const svg = svgRef.current
    if (!svg || activeRef.current) return
    activeRef.current = true

    const pathEls = Array.from(svg.querySelectorAll('path'))
    const lengths = pathEls.map((p) => {
      const len = p.getTotalLength()
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
      return len
    })

    while (activeRef.current) {
      // draw in
      for (let i = 0; i < pathEls.length; i++) {
        if (!activeRef.current) return
        const speed = i === dotIndex ? dotDrawSpeed : drawSpeed
        await animatePath(pathEls[i], lengths[i], 0, lengths[i] / speed)
      }

      await wait(holdMs)
      if (!activeRef.current) return

      // erase all at once
      await Promise.all(
        pathEls.map((p, i) =>
          animatePath(p, 0, -lengths[i], lengths[i] / eraseSpeed),
        ),
      )

      await wait(pauseMs)
      if (!activeRef.current) return

      // reset
      for (let i = 0; i < pathEls.length; i++) {
        pathEls[i].style.strokeDashoffset = `${lengths[i]}`
      }
    }
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          startLoop()
        }
      },
      { rootMargin: '-20px' },
    )
    observer.observe(svg)

    return () => {
      activeRef.current = false
      observer.disconnect()
    }
  }, [startLoop])

  return (
    <svg
      ref={svgRef}
      viewBox="-5 -15 820 540"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="19.797"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* main stroke */}
        <path d="M261.31 252.9C325.753-4.87122-14.9232 275.763 56.0193 425.531C94.131 505.989 191.836 383.912 214.653 355.545C231.15 335.035 282.966 288.67 256.644 288.67C243.735 288.67 194.001 384.1 217.763 395.981C267.906 421.052 292.582 309.762 335.961 321.33C360.519 327.879 332.789 389.31 370.176 392.871C412.732 396.924 442.942 338.438 485.264 338.438C501.604 338.438 514.024 388.721 539.697 394.426C546.782 396 554.444 396.247 561.47 394.426C592.175 386.465 601.758 352.761 633.011 344.659C692.344 329.276 722.957 382.89 796.31 346.214" />
        {/* i dot (slower) */}
        <path d="M580.768 238.654C595.031 251.134 586.389 245.111 607.762 255.085" />
      </g>
    </svg>
  )
}
