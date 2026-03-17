import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getSiteConfig, updateSiteConfig } from '~/server/config'
import type { SiteConfig } from '~/server/config'

export const Route = createFileRoute('/~/dashboard/settings')({
	loader: () => getSiteConfig(),
	component: SettingsPage,
})

interface FieldDef {
	key: keyof SiteConfig
	label: string
	placeholder: string
}

const sections: { title: string; fields: FieldDef[] }[] = [
	{
		title: 'Site',
		fields: [
			{ key: 'title', label: 'Title', placeholder: 'Site Name' },
			{ key: 'description', label: 'Description', placeholder: 'A one-sentence description' },
			{ key: 'url', label: 'URL', placeholder: 'https://example.com' },
			{ key: 'language', label: 'Language', placeholder: 'en' },
			{ key: 'copyright', label: 'Copyright', placeholder: 'Site Name' },
			{ key: 'icp', label: 'ICP', placeholder: '' },
			{ key: 'icpLink', label: 'ICP Link', placeholder: 'https://beian.miit.gov.cn' },
		],
	},
	{
		title: 'Owner',
		fields: [
			{ key: 'ownerName', label: 'Name', placeholder: 'Owner Name' },
			{ key: 'ownerBio', label: 'Bio', placeholder: 'A short biography' },
			{ key: 'ownerEmail', label: 'Email', placeholder: 'owner@example.com' },
		],
	},
	{
		title: 'Footer',
		fields: [
			{ key: 'footerName', label: 'Name', placeholder: 'Site Name' },
			{ key: 'footerDescription', label: 'Description', placeholder: 'A short footer text' },
		],
	},
	{
		title: 'Footer Navigation',
		fields: [{ key: 'footerNav', label: 'Navigation (JSON)', placeholder: '[]' }],
	},
]

function SettingsPage() {
	const initial = Route.useLoaderData()
	const router = useRouter()
	const [form, setForm] = useState<SiteConfig>({ ...initial })
	const [saving, setSaving] = useState(false)

	function handleChange(field: keyof SiteConfig, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }))
	}

	async function handleSubmit(ev: React.FormEvent) {
		ev.preventDefault()
		setSaving(true)
		try {
			await updateSiteConfig({ data: form })
			await router.invalidate()
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<h2 className="text-content-heading mb-6 text-lg font-semibold">Settings</h2>
			<form onSubmit={(ev) => void handleSubmit(ev)} className="max-w-lg space-y-8">
				{sections.map((section) => (
					<fieldset key={section.title} className="space-y-4">
						<legend className="text-content-heading text-sm font-semibold">{section.title}</legend>
						{section.fields.map(({ key, label, placeholder }) => (
							<div key={key}>
								<label
									htmlFor={key}
									className="text-content-secondary mb-1.5 block text-sm font-medium"
								>
									{label}
								</label>
								{key === 'footerNav' ? (
									<textarea
										id={key}
										value={form[key]}
										onChange={(ev) => handleChange(key, ev.target.value)}
										placeholder={placeholder}
										rows={10}
										className="bg-sunken border-border-default text-content-primary w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none"
									/>
								) : (
									<input
										id={key}
										type="text"
										value={form[key]}
										onChange={(ev) => handleChange(key, ev.target.value)}
										placeholder={placeholder}
										className="bg-sunken border-border-default text-content-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
									/>
								)}
							</div>
						))}
					</fieldset>
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
