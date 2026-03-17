import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/~/dashboard')({
	component: DashboardLayout,
})

function DashboardLayout() {
	return (
		<div className="mx-auto max-w-5xl px-6 py-8">
			<h1 className="text-content-heading text-2xl font-bold">Dashboard</h1>
			<div className="mt-6">
				<Outlet />
			</div>
		</div>
	)
}
