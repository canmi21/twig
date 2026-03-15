import { Star } from 'lucide-react'

export function RatingStars({ rating }: { rating: number }) {
	return (
		<div className="inline-flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
			{Array.from({ length: 5 }, (_, i) => (
				<Star
					key={i}
					className={`size-3.5 ${i < rating ? 'fill-primary text-primary' : 'text-content-disabled'}`}
				/>
			))}
		</div>
	)
}
