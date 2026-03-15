import { createFileRoute } from '@tanstack/react-router'
import { ContentEditor } from '~/components/dashboard/content-editor'

export const Route = createFileRoute('/dashboard/editor')({
	validateSearch: (search: Record<string, unknown>) => ({
		type: (search.type as string) || 'post',
	}),
	component: NewEditorPage,
})

function NewEditorPage() {
	const { type } = Route.useSearch()
	return <ContentEditor defaultType={type} />
}
