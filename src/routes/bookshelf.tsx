import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bookshelf')({
	component: () => (
		<div className="text-content-tertiary py-24 text-center text-sm">Under construction</div>
	),
})
