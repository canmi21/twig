import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { createGuestbookEntry } from '~/server/functions/guestbook'

export function GuestbookForm() {
	const router = useRouter()
	const [nickname, setNickname] = useState('')
	const [content, setContent] = useState('')
	const [website, setWebsite] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setSubmitting(true)

		try {
			const result = await createGuestbookEntry({
				data: { nickname, content, website: website || undefined },
			})
			if (result.success) {
				setNickname('')
				setContent('')
				setWebsite('')
				void router.invalidate()
			} else {
				setError(result.error ?? 'Something went wrong.')
			}
		} catch {
			setError('Failed to submit. Please try again.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<form
			onSubmit={(e) => void handleSubmit(e)}
			className="border-border-default mb-8 space-y-3 rounded-lg border p-4"
		>
			<h2 className="text-content-heading text-lg font-semibold">Leave a message</h2>
			{error && <p className="text-danger-text text-sm">{error}</p>}
			<div className="flex gap-3">
				<input
					type="text"
					placeholder="Nickname"
					value={nickname}
					onChange={(e) => setNickname(e.target.value)}
					maxLength={50}
					required
					className="border-border-default bg-surface text-content-primary placeholder:text-content-disabled focus:border-primary w-1/2 rounded-md border px-3 py-1.5 text-sm outline-none"
				/>
				<input
					type="url"
					placeholder="Website (optional)"
					value={website}
					onChange={(e) => setWebsite(e.target.value)}
					maxLength={200}
					className="border-border-default bg-surface text-content-primary placeholder:text-content-disabled focus:border-primary w-1/2 rounded-md border px-3 py-1.5 text-sm outline-none"
				/>
			</div>
			<textarea
				placeholder="Your message..."
				value={content}
				onChange={(e) => setContent(e.target.value)}
				maxLength={500}
				required
				rows={3}
				className="border-border-default bg-surface text-content-primary placeholder:text-content-disabled focus:border-primary w-full rounded-md border px-3 py-2 text-sm outline-none"
			/>
			<button
				type="submit"
				disabled={submitting}
				className="bg-primary text-primary-foreground hover:bg-accent-hover rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
			>
				{submitting ? 'Sending...' : 'Send'}
			</button>
		</form>
	)
}
