import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getSiteConfig, updateSiteConfig } from '~/server/config'
import type { SiteConfig } from '~/server/config'

export const Route = createFileRoute('/~/dashboard/settings')({
	loader: () => getSiteConfig(),
	component: SettingsPage,
})

function SettingsPage() {
	const initial = Route.useLoaderData()
	const router = useRouter()
	const [form, setForm] = useState<SiteConfig>({ ...initial })
	const [saving, setSaving] = useState(false)

	function handleChange(field: keyof SiteConfig, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }))
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setSaving(true)
		try {
			await updateSiteConfig({ data: form })
			await router.invalidate()
		} finally {
			setSaving(false)
		}
	}

	const fields: { key: keyof SiteConfig; label: string; placeholder: string }[] = [
		{ key: 'title', label: 'Title', placeholder: 'Site Name' },
		{ key: 'description', label: 'Description', placeholder: 'A short description of the site' },
		{ key: 'url', label: 'URL', placeholder: 'https://example.com' },
		{ key: 'language', label: 'Language', placeholder: 'en' },
	]

	return (
		<div>
			<h2 className="text-content-heading mb-6 text-lg font-semibold">Settings</h2>
			<form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-5">
				{fields.map(({ key, label, placeholder }) => (
					<div key={key}>
						<label
							htmlFor={key}
							className="text-content-secondary mb-1.5 block text-sm font-medium"
						>
							{label}
						</label>
						<input
							id={key}
							type="text"
							value={form[key]}
							onChange={(e) => handleChange(key, e.target.value)}
							placeholder={placeholder}
							className="bg-sunken border-border-default text-content-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
						/>
					</div>
				))}
				<button
					type="submit"
					disabled={saving}
					className="bg-primary text-on-primary cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</form>
		</div>
	)
}
