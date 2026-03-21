/* src/components/not-found-page.tsx */

export function NotFoundPage() {
	return (
		<section className="relative flex min-h-[60svh] items-center">
			<div className="border-border-default relative min-h-96 w-full border border-dashed sm:min-h-112">
				{/* Top-left corner mark */}
				<div aria-hidden="true" className="absolute top-0 left-0 z-10 size-8 -translate-1/2">
					<div className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 bg-(--text-tertiary)" />
					<div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-(--text-tertiary)" />
				</div>

				{/* Bottom-right corner mark */}
				<div aria-hidden="true" className="absolute right-0 bottom-0 z-10 size-8 translate-1/2">
					<div className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 bg-(--text-tertiary)" />
					<div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-(--text-tertiary)" />
				</div>

				{/* Golden ratio — height fills paper, width = height * phi, left-aligned */}
				<svg
					className="absolute top-0 left-0 h-full select-none"
					viewBox="0 0 1618 1000"
					role="img"
					aria-label="Empty"
				>
					{/* Golden ratio — subdivision lines */}
					<line
						x1="1000"
						y1="0"
						x2="1000"
						y2="1000"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="1000"
						y1="618"
						x2="1618"
						y2="618"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="1236"
						y1="618"
						x2="1236"
						y2="1000"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="1000"
						y1="764"
						x2="1236"
						y2="764"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="1146"
						y1="618"
						x2="1146"
						y2="764"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="1146"
						y1="708"
						x2="1236"
						y2="708"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>

					{/* Golden spiral */}
					<path
						d="M 0 1000 A 1000 1000 0 0 1 1000 0 A 618 618 0 0 1 1618 618 A 382 382 0 0 1 1236 1000 A 236 236 0 0 1 1000 764 A 146 146 0 0 1 1146 618 A 90 90 0 0 1 1236 708 A 56 56 0 0 1 1180 764"
						fill="none"
						stroke="var(--border-default)"
						strokeWidth="0.5"
					/>

					{/* Typographic guides — cap height, baseline, descender */}
					<line
						x1="0"
						y1="360"
						x2="1618"
						y2="360"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="0"
						y1="570"
						x2="1618"
						y2="570"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>
					<line
						x1="0"
						y1="636"
						x2="1618"
						y2="636"
						stroke="var(--border-default)"
						strokeWidth="0.5"
						strokeDasharray="6 4"
					/>

					{/* "Empty" — stroke-only, no fill */}
					<text
						x="809"
						y="570"
						textAnchor="middle"
						fontFamily="'Noto Sans', Arial, sans-serif"
						fontSize="420"
						fontWeight="600"
						letterSpacing="0.06em"
						fill="none"
						stroke="var(--text-tertiary)"
						strokeWidth="0.5"
					>
						Empty
					</text>
				</svg>
			</div>
		</section>
	)
}
