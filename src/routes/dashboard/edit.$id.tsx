import { createFileRoute } from '@tanstack/react-router'
import { ContentEditor } from '~/features/dashboard/components/content-editor'
import { getContentForEdit, type ContentForEdit } from '~/features/dashboard/server/dashboard'

export const Route = createFileRoute('/dashboard/edit/$id')({
	loader: async ({ params }): Promise<ContentForEdit | null> => {
		return await getContentForEdit({ data: { id: params.id } })
	},
	component: EditEditorPage,
})

function EditEditorPage() {
	const data = Route.useLoaderData()
	return <ContentEditor initial={data} />
}
