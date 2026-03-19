/* src/components/icons/dot-circle.tsx */

import type { SVGProps } from 'react'

export function DotCircle(props: SVGProps<SVGSVGElement>) {
	return (
		<svg width="1em" height="1em" viewBox="0 0 512 512" {...props}>
			<circle cx="256" cy="256" r="200" fill="currentColor" opacity={0.1} />
			<path
				fill="currentColor"
				d="M256 56c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m0-48C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8z"
			/>
			<path
				fill="currentColor"
				d="M256 176c-44.183 0-80 35.817-80 80s35.817 80 80 80 80-35.817 80-80-35.817-80-80-80z"
			/>
		</svg>
	)
}
