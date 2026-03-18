/* src/routes/~/settings/footer.tsx */

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { getSiteConfig, updateSiteConfig } from '~/server/config'
import type { SiteConfig } from '~/server/config'

export const Route = createFileRoute('/~/settings/footer')({
	loader: () => getSiteConfig(),
	component: FooterSettingsPage,
})

interface NavLink {
	label: string
	href: string
}

interface NavColumn {
	title: string
	links: NavLink[]
}

function parseFooterNav(raw: string): NavColumn[] {
	try {
		const parsed = JSON.parse(raw)
		if (Array.isArray(parsed)) {
			return parsed as NavColumn[]
		}
	} catch {
		// fall through
	}
	return []
}

function FooterSettingsPage() {
	const initial = Route.useLoaderData()
	const router = useRouter()

	const [footerName, setFooterName] = useState(initial.footerName)
	const [footerDescription, setFooterDescription] = useState(initial.footerDescription)
	const [columns, setColumns] = useState<NavColumn[]>(() => parseFooterNav(initial.footerNav))
	const [saving, setSaving] = useState(false)

	function updateColumn(colIdx: number, field: 'title', value: string) {
		setColumns((prev) => prev.map((col, i) => (i === colIdx ? { ...col, [field]: value } : col)))
	}

	function updateLink(colIdx: number, linkIdx: number, patch: Partial<NavLink>) {
		setColumns((prev) =>
			prev.map((col, ci) =>
				ci === colIdx
					? {
							...col,
							links: col.links.map((link, li) => (li === linkIdx ? { ...link, ...patch } : link)),
						}
					: col,
			),
		)
	}

	function addLink(colIdx: number) {
		setColumns((prev) =>
			prev.map((col, i) =>
				i === colIdx ? { ...col, links: [...col.links, { label: '', href: '' }] } : col,
			),
		)
	}

	function removeLink(colIdx: number, linkIdx: number) {
		setColumns((prev) =>
			prev.map((col, ci) =>
				ci === colIdx ? { ...col, links: col.links.filter((_l, li) => li !== linkIdx) } : col,
			),
		)
	}

	function addColumn() {
		setColumns((prev) => [...prev, { title: '', links: [{ label: '', href: '' }] }])
	}

	function removeColumn(colIdx: number) {
		setColumns((prev) => prev.filter((_c, i) => i !== colIdx))
	}

	async function handleSubmit(ev: React.FormEvent) {
		ev.preventDefault()
		setSaving(true)
		try {
			const data: Partial<SiteConfig> = {
				footerName,
				footerDescription,
				footerNav: JSON.stringify(columns),
			}
			await updateSiteConfig({ data })
			await router.invalidate()
		} finally {
			setSaving(false)
		}
	}

	return (
		<form onSubmit={(ev) => void handleSubmit(ev)} className="max-w-lg space-y-8">
			{/* Basic fields */}
			<fieldset className="space-y-4">
				<legend className="text-content-heading text-sm font-semibold">Footer</legend>
				<div>
					<label
						htmlFor="footerName"
						className="text-content-secondary mb-1.5 block text-sm font-medium"
					>
						Name
					</label>
					<input
						id="footerName"
						type="text"
						value={footerName}
						onChange={(ev) => setFooterName(ev.target.value)}
						placeholder="Site Name"
						className="bg-sunken border-border-default text-content-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
					/>
				</div>
				<div>
					<label
						htmlFor="footerDescription"
						className="text-content-secondary mb-1.5 block text-sm font-medium"
					>
						Description
					</label>
					<input
						id="footerDescription"
						type="text"
						value={footerDescription}
						onChange={(ev) => setFooterDescription(ev.target.value)}
						placeholder="A short footer text"
						className="bg-sunken border-border-default text-content-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
					/>
				</div>
			</fieldset>

			{/* Structured nav editor */}
			<fieldset className="space-y-4">
				<legend className="text-content-heading text-sm font-semibold">Navigation Columns</legend>

				{columns.map((col, colIdx) => (
					/* oxlint-disable-next-line react/no-array-index-key -- columns have no stable id */
					<div key={colIdx} className="border-border-subtle rounded-lg border p-4">
						<div className="mb-3 flex items-center gap-2">
							<input
								type="text"
								value={col.title}
								onChange={(ev) => updateColumn(colIdx, 'title', ev.target.value)}
								placeholder="Column title"
								className="bg-sunken border-border-default text-content-primary flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none"
							/>
							<button
								type="button"
								onClick={() => removeColumn(colIdx)}
								className="text-content-secondary cursor-pointer p-1 hover:text-red-600"
								title="Remove column"
							>
								<Minus size={16} />
							</button>
						</div>

						<div className="space-y-2">
							{col.links.map((link, linkIdx) => (
								/* oxlint-disable-next-line react/no-array-index-key -- links have no stable id */
								<div key={linkIdx} className="flex items-center gap-2">
									<input
										type="text"
										value={link.label}
										onChange={(ev) => updateLink(colIdx, linkIdx, { label: ev.target.value })}
										placeholder="Label"
										className="bg-sunken border-border-default text-content-primary flex-1 rounded-md border px-2 py-1 text-sm focus:outline-none"
									/>
									<input
										type="text"
										value={link.href}
										onChange={(ev) => updateLink(colIdx, linkIdx, { href: ev.target.value })}
										placeholder="URL"
										className="bg-sunken border-border-default text-content-primary flex-1 rounded-md border px-2 py-1 font-mono text-sm focus:outline-none"
									/>
									<button
										type="button"
										onClick={() => removeLink(colIdx, linkIdx)}
										className="text-content-secondary cursor-pointer p-1 hover:text-red-600"
										title="Remove link"
									>
										<Minus size={14} />
									</button>
								</div>
							))}
						</div>

						<button
							type="button"
							onClick={() => addLink(colIdx)}
							className="text-content-secondary hover:text-content-heading mt-2 flex cursor-pointer items-center gap-1 text-xs"
						>
							<Plus size={14} />
							Add link
						</button>
					</div>
				))}

				<button
					type="button"
					onClick={addColumn}
					className="text-content-secondary hover:text-content-heading flex cursor-pointer items-center gap-1 text-sm"
				>
					<Plus size={16} />
					Add column
				</button>
			</fieldset>

			<button
				type="submit"
				disabled={saving}
				className="bg-primary text-on-primary cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
			>
				{saving ? 'Saving...' : 'Save'}
			</button>
		</form>
	)
}
