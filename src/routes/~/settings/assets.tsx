/* src/routes/~/settings/assets.tsx */

import { createFileRoute } from '@tanstack/react-router'
import { Minus, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { resolveAssetUrl } from '~/lib/assets'
import { deleteAsset, getAssetExists, getRobotsTxt, uploadAsset } from '~/server/assets'
import { getSiteConfig } from '~/server/config'

export const Route = createFileRoute('/~/settings/assets')({
	loader: async () => {
		const [config, robotsTxt] = await Promise.all([getSiteConfig(), getRobotsTxt()])
		return { siteUrl: config.url, robotsTxt }
	},
	component: AssetsSettingsPage,
})

// ---------------------------------------------------------------------------
// Icon management
// ---------------------------------------------------------------------------

const ICON_SLOTS = [
	{ key: 'favicon.svg', label: 'favicon.svg', accept: 'image/svg+xml' },
	{ key: 'favicon-96x96.png', label: 'favicon-96x96.png', accept: 'image/png' },
	{ key: 'favicon.ico', label: 'favicon.ico', accept: 'image/x-icon' },
	{ key: 'apple-touch-icon.png', label: 'apple-touch-icon.png', accept: 'image/png' },
] as const

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.addEventListener('load', () => {
			const result = reader.result as string
			resolve(result.split(',')[1])
		})
		reader.addEventListener('error', () => reject(new Error('Failed to read file')))
		reader.readAsDataURL(file)
	})
}

function IconSlot({ slotKey, label, accept }: { slotKey: string; label: string; accept: string }) {
	const [exists, setExists] = useState<boolean | null>(null)
	const [uploading, setUploading] = useState(false)
	const [deleting, setDeleting] = useState(false)

	// Cache-bust key to force preview refresh after upload
	const [version, setVersion] = useState(0)

	useEffect(() => {
		void getAssetExists({ data: { key: slotKey } }).then((res) => setExists(res.exists))
	}, [slotKey, version])

	async function handleUpload(ev: React.ChangeEvent<HTMLInputElement>) {
		const file = ev.target.files?.[0]
		if (!file) {
			return
		}
		setUploading(true)
		try {
			const base64 = await fileToBase64(file)
			await uploadAsset({ data: { key: slotKey, base64, type: file.type } })
			setExists(true)
			setVersion((prev) => prev + 1)
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Upload failed')
		} finally {
			setUploading(false)
			ev.target.value = ''
		}
	}

	async function handleDelete() {
		if (!confirm(`Delete ${label}?`)) {
			return
		}
		setDeleting(true)
		try {
			await deleteAsset({ data: { key: slotKey } })
			setExists(false)
			setVersion((prev) => prev + 1)
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Delete failed')
		} finally {
			setDeleting(false)
		}
	}

	return (
		<div className="border-border-subtle flex items-center gap-4 rounded-lg border p-3">
			<div className="bg-sunken flex size-12 shrink-0 items-center justify-center rounded-md">
				{exists ? (
					<img
						src={`${resolveAssetUrl(slotKey)}?v=${version}`}
						alt={label}
						className="size-10 object-contain"
					/>
				) : (
					<span className="text-content-disabled text-xs">--</span>
				)}
			</div>

			<div className="flex-1">
				<p className="text-content-primary text-sm font-medium">{label}</p>
				<p className="text-content-tertiary text-xs">
					{exists === null && 'Checking...'}
					{exists === true && 'Uploaded'}
					{exists === false && 'Not uploaded'}
				</p>
			</div>

			<div className="flex gap-2">
				<label
					className={`text-content-secondary hover:text-content-heading flex cursor-pointer items-center gap-1 text-xs ${uploading ? 'opacity-50' : ''}`}
				>
					<Upload size={14} />
					{uploading ? 'Uploading...' : 'Upload'}
					<input
						type="file"
						accept={accept}
						onChange={(ev) => void handleUpload(ev)}
						className="hidden"
						disabled={uploading}
					/>
				</label>
				{exists && (
					<button
						type="button"
						onClick={() => void handleDelete()}
						disabled={deleting}
						className="text-content-secondary flex cursor-pointer items-center gap-1 text-xs hover:text-red-600 disabled:opacity-50"
					>
						<Trash2 size={14} />
						Delete
					</button>
				)}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// robots.txt editor
// ---------------------------------------------------------------------------

interface RobotRule {
	userAgent: string
	disallows: string[]
}

function parseRobotsTxt(raw: string): RobotRule[] {
	if (!raw.trim()) {
		return [{ userAgent: '*', disallows: [''] }]
	}

	const rules: RobotRule[] = []
	let current: RobotRule | null = null

	for (const rawLine of raw.split('\n')) {
		const line = rawLine.trim()
		const lower = line.toLowerCase()
		// Skip comments, sitemap lines, and empty lines
		if (!line || line.startsWith('#') || lower.startsWith('sitemap:')) {
			// no-op
		} else if (lower.startsWith('user-agent:')) {
			if (current) {
				rules.push(current)
			}
			current = { userAgent: line.slice('user-agent:'.length).trim(), disallows: [] }
		} else if (lower.startsWith('disallow:') && current) {
			current.disallows.push(line.slice('disallow:'.length).trim())
		}
	}
	if (current) {
		rules.push(current)
	}
	return rules.length > 0 ? rules : [{ userAgent: '*', disallows: [''] }]
}

function serializeRobotsTxt(rules: RobotRule[], siteUrl: string): string {
	const lines = ['# https://www.robotstxt.org/robotstxt.html']
	for (const rule of rules) {
		lines.push(`User-agent: ${rule.userAgent}`)
		for (const d of rule.disallows) {
			lines.push(`Disallow: ${d}`)
		}
	}
	lines.push(`Sitemap: ${siteUrl}/sitemap.xml`)
	return `${lines.join('\n')}\n`
}

function RobotsTxtEditor({ initial, siteUrl }: { initial: string; siteUrl: string }) {
	const [rules, setRules] = useState<RobotRule[]>(() => parseRobotsTxt(initial))
	const [saving, setSaving] = useState(false)

	function updateUserAgent(ruleIdx: number, value: string) {
		setRules((prev) =>
			prev.map((rule, idx) => (idx === ruleIdx ? { ...rule, userAgent: value } : rule)),
		)
	}

	function updateDisallow(ruleIdx: number, disIdx: number, value: string) {
		setRules((prev) =>
			prev.map((rule, ri) =>
				ri === ruleIdx
					? {
							...rule,
							disallows: rule.disallows.map((val, di) => (di === disIdx ? value : val)),
						}
					: rule,
			),
		)
	}

	function addDisallow(ruleIdx: number) {
		setRules((prev) =>
			prev.map((rule, idx) =>
				idx === ruleIdx ? { ...rule, disallows: [...rule.disallows, ''] } : rule,
			),
		)
	}

	function removeDisallow(ruleIdx: number, disIdx: number) {
		setRules((prev) =>
			prev.map((rule, ri) =>
				ri === ruleIdx
					? { ...rule, disallows: rule.disallows.filter((_val, di) => di !== disIdx) }
					: rule,
			),
		)
	}

	function addRule() {
		setRules((prev) => [...prev, { userAgent: '*', disallows: [''] }])
	}

	function removeRule(ruleIdx: number) {
		setRules((prev) => prev.filter((_rule, idx) => idx !== ruleIdx))
	}

	async function handleSave() {
		setSaving(true)
		try {
			const text = serializeRobotsTxt(rules, siteUrl)
			const base64 = btoa(text)
			await uploadAsset({ data: { key: 'robots.txt', base64, type: 'text/plain' } })
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to save')
		} finally {
			setSaving(false)
		}
	}

	return (
		<fieldset className="space-y-4">
			<legend className="text-content-heading text-sm font-semibold">robots.txt</legend>

			{rules.map((rule, ruleIdx) => (
				/* oxlint-disable-next-line react/no-array-index-key -- rules have no stable id */
				<div key={ruleIdx} className="border-border-subtle rounded-lg border p-4">
					<div className="mb-3 flex items-center gap-2">
						<label className="text-content-secondary shrink-0 text-xs">User-agent:</label>
						<input
							type="text"
							value={rule.userAgent}
							onChange={(ev) => updateUserAgent(ruleIdx, ev.target.value)}
							className="border-border-default bg-sunken text-content-primary flex-1 rounded-md border px-2 py-1 font-mono text-sm focus:outline-none"
						/>
						<button
							type="button"
							onClick={() => removeRule(ruleIdx)}
							className="text-content-secondary cursor-pointer p-1 hover:text-red-600"
							title="Remove rule"
						>
							<Minus size={16} />
						</button>
					</div>

					<div className="space-y-2">
						{rule.disallows.map((disallow, disIdx) => (
							/* oxlint-disable-next-line react/no-array-index-key -- disallows have no stable id */
							<div key={disIdx} className="flex items-center gap-2">
								<label className="text-content-secondary shrink-0 text-xs">Disallow:</label>
								<input
									type="text"
									value={disallow}
									onChange={(ev) => updateDisallow(ruleIdx, disIdx, ev.target.value)}
									placeholder="/path"
									className="border-border-default bg-sunken text-content-primary flex-1 rounded-md border px-2 py-1 font-mono text-sm focus:outline-none"
								/>
								<button
									type="button"
									onClick={() => removeDisallow(ruleIdx, disIdx)}
									className="text-content-secondary cursor-pointer p-1 hover:text-red-600"
								>
									<Minus size={14} />
								</button>
							</div>
						))}
					</div>

					<button
						type="button"
						onClick={() => addDisallow(ruleIdx)}
						className="text-content-secondary hover:text-content-heading mt-2 flex cursor-pointer items-center gap-1 text-xs"
					>
						<Plus size={14} />
						Add disallow
					</button>
				</div>
			))}

			<button
				type="button"
				onClick={addRule}
				className="text-content-secondary hover:text-content-heading flex cursor-pointer items-center gap-1 text-sm"
			>
				<Plus size={16} />
				Add rule
			</button>

			<div>
				<button
					type="button"
					onClick={() => void handleSave()}
					disabled={saving}
					className="bg-primary text-primary-foreground cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save robots.txt'}
				</button>
			</div>
		</fieldset>
	)
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function AssetsSettingsPage() {
	const { siteUrl, robotsTxt } = Route.useLoaderData()

	return (
		<div className="max-w-lg space-y-8">
			<fieldset className="space-y-3">
				<legend className="text-content-heading text-sm font-semibold">Icons</legend>
				{ICON_SLOTS.map((slot) => (
					<IconSlot key={slot.key} slotKey={slot.key} label={slot.label} accept={slot.accept} />
				))}
			</fieldset>

			<RobotsTxtEditor initial={robotsTxt} siteUrl={siteUrl} />
		</div>
	)
}
