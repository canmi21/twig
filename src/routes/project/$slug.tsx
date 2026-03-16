import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { TagList } from '~/features/content/components/tag-list'
import { getContentBySlug, type ContentDetail } from '~/features/content/server/content'

export const Route = createFileRoute('/project/$slug')({
	loader: async ({ params }): Promise<ContentDetail | null> =>
		await getContentBySlug({ data: { slug: params.slug } }),
	notFoundComponent: NotFound,
	component: ProjectPage,
})

function NotFound() {
	return (
		<section className="py-16 text-center">
			<h1 className="text-content-heading text-2xl font-semibold">Project not found</h1>
			<p className="text-content-secondary mt-2">The project you are looking for does not exist.</p>
			<Link
				to="/projects"
				className="text-primary hover:text-accent-hover mt-4 inline-block text-sm font-medium transition-colors hover:underline"
			>
				Back to projects
			</Link>
		</section>
	)
}

/** Renders owner-authored content (not user-generated input) */
function ContentHtml({ html }: { html: string }) {
	return (
		<div
			className="prose prose-sm sm:prose-base max-w-none"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}

function ProjectPage() {
	const project = Route.useLoaderData()

	if (!project) return <NotFound />

	return (
		<article className="mx-auto max-w-3xl">
			<Link
				to="/projects"
				className="text-content-secondary hover:text-content-heading mb-6 inline-flex items-center gap-1 text-sm no-underline transition-colors"
			>
				&larr; Back to projects
			</Link>
			{project.coverImage && (
				<img
					src={project.coverImage}
					alt={project.title ?? ''}
					className="mb-6 h-56 w-full rounded-lg object-cover sm:h-72"
				/>
			)}
			<header className="border-border-default mb-8 border-b pb-6">
				<h1 className="text-content-heading text-3xl font-semibold tracking-tight sm:text-4xl">
					{project.title}
				</h1>
				{project.project && (
					<div className="mt-3 flex flex-wrap items-center gap-3">
						<span className="bg-accent-subtle text-accent-on-subtle rounded-full px-2.5 py-0.5 text-xs font-medium">
							{project.project.status}
						</span>
						{project.project.role && (
							<span className="text-content-secondary text-sm">{project.project.role}</span>
						)}
						{project.project.demoUrl && (
							<a
								href={project.project.demoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:text-accent-hover inline-flex items-center gap-1 text-sm"
							>
								<ExternalLink className="size-3.5" /> Demo
							</a>
						)}
						{project.project.repoUrl && (
							<a
								href={project.project.repoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:text-accent-hover inline-flex items-center gap-1 text-sm"
							>
								<ExternalLink className="size-3.5" /> Repo
							</a>
						)}
					</div>
				)}
				{project.project && project.project.techStack.length > 0 && (
					<div className="mt-3 flex flex-wrap gap-1.5">
						{project.project.techStack.map((tech) => (
							<span
								key={tech}
								className="bg-elevated text-content-secondary rounded px-2 py-0.5 text-xs"
							>
								{tech}
							</span>
						))}
					</div>
				)}
				{project.tags.length > 0 && (
					<div className="mt-3">
						<TagList tags={project.tags} />
					</div>
				)}
			</header>
			<ContentHtml html={project.contentHtml} />
		</article>
	)
}
