import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import {
	getSiteSettings,
	saveSiteSettings,
	type SiteSettings,
} from '~/features/site/server/settings'

export const Route = createFileRoute('/dashboard/settings')({
	loader: async (): Promise<SiteSettings> => {
		return await getSiteSettings()
	},
	component: SettingsPage,
})

function SettingsPage() {
	const initial = Route.useLoaderData()
	const [form, setForm] = useState<SiteSettings>(initial)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)

	function handleChange(key: keyof SiteSettings, value: string) {
		setForm((prev) => ({ ...prev, [key]: value }))
		setSaved(false)
	}

	function handleSave() {
		setSaving(true)
		void saveSiteSettings({ data: form })
			.then(() => setSaved(true))
			.finally(() => setSaving(false))
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<h2 className="text-content-heading text-xl font-semibold">Site Settings</h2>
				<button
					type="button"
					onClick={handleSave}
					disabled={saving}
					className="bg-primary text-primary-contrast inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					<Save className="size-4" />
					{saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
				</button>
			</div>

			<div className="space-y-6">
				<SettingField
					label="Site Title"
					description="Displayed in the browser tab and page header."
					value={form.siteTitle}
					onChange={(v) => handleChange('siteTitle', v)}
				/>
				<SettingField
					label="Site Description"
					description="Used in the HTML meta description for SEO."
					value={form.siteDescription}
					onChange={(v) => handleChange('siteDescription', v)}
				/>
				<SettingField
					label="Footer Text"
					description="The description paragraph shown in the site footer."
					value={form.footerText}
					onChange={(v) => handleChange('footerText', v)}
					multiline
				/>
				<SettingField
					label="Copyright"
					description="Name used in the copyright notice: '(c) {year} {name}. All rights reserved.'"
					value={form.copyright}
					onChange={(v) => handleChange('copyright', v)}
				/>
			</div>
		</div>
	)
}

function SettingField({
	label,
	description,
	value,
	onChange,
	multiline,
}: {
	label: string
	description: string
	value: string
	onChange: (value: string) => void
	multiline?: boolean
}) {
	return (
		<div>
			<label className="block">
				<span className="text-content-heading text-sm font-medium">{label}</span>
				<p className="text-content-tertiary mb-2 text-xs">{description}</p>
				{multiline ? (
					<textarea
						value={value}
						onChange={(e) => onChange(e.target.value)}
						rows={3}
						className="field-input resize-y"
					/>
				) : (
					<input
						type="text"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="field-input"
					/>
				)}
			</label>
		</div>
	)
}
