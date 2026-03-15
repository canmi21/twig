import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { getProjectsList, type TimelineItem } from '~/server/functions/content'
import { getPlatformStatus } from '~/server/functions/health'
import { TagList } from '~/components/tag-list'

export const Route = createFileRoute('/projects')({
	loader: async (): Promise<TimelineItem[]> => {
		await getPlatformStatus()
		return await getProjectsList()
	},
	component: ProjectsPage,
})

function ProjectsPage() {
	const projects = Route.useLoaderData()

	return (
		<section>
			<h1 className="text-content-heading mb-6 text-2xl font-semibold">Projects</h1>
			<div className="grid gap-4 sm:grid-cols-2">
				{projects.map((project) => (
					<article
						key={project.id}
						className="border-border-default overflow-hidden rounded-lg border"
					>
						{project.coverImage && (
							<Link to="/project/$slug" params={{ slug: project.slug! }}>
								<img
									src={project.coverImage}
									alt={project.title ?? ''}
									className="h-40 w-full object-cover"
									loading="lazy"
								/>
							</Link>
						)}
						<div className="p-4">
							<div className="mb-2 flex items-center gap-2">
								{project.project && (
									<span className="bg-accent-subtle text-accent-on-subtle rounded-full px-2 py-0.5 text-xs font-medium">
										{project.project.status}
									</span>
								)}
							</div>
							<Link
								to="/project/$slug"
								params={{ slug: project.slug! }}
								className="text-content-heading hover:text-primary text-lg font-semibold no-underline transition-colors"
							>
								{project.title}
							</Link>
							{project.summary && (
								<p className="text-content-secondary mt-1 text-sm">{project.summary}</p>
							)}
							{project.project && project.project.techStack.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1">
									{project.project.techStack.map((tech) => (
										<span
											key={tech}
											className="bg-elevated text-content-secondary rounded px-1.5 py-0.5 text-xs"
										>
											{tech}
										</span>
									))}
								</div>
							)}
							{project.project && (
								<div className="mt-2 flex gap-3">
									{project.project.demoUrl && (
										<a
											href={project.project.demoUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:text-accent-hover inline-flex items-center gap-1 text-xs"
										>
											<ExternalLink className="size-3" /> Demo
										</a>
									)}
									{project.project.repoUrl && (
										<a
											href={project.project.repoUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:text-accent-hover inline-flex items-center gap-1 text-xs"
										>
											<ExternalLink className="size-3" /> Repo
										</a>
									)}
								</div>
							)}
							<div className="mt-2">
								<TagList tags={project.tags} />
							</div>
						</div>
					</article>
				))}
			</div>
			{projects.length === 0 && (
				<p className="text-content-secondary py-12 text-center">No projects yet.</p>
			)}
		</section>
	)
}
