import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
	component: AboutPage,
})

function AboutPage() {
	return (
		<article className="prose prose-sm sm:prose-base max-w-none">
			<h1>About</h1>
			<p>Hi. I build things for the web.</p>
			<p>
				This site is my digital alter ego -- a place where I collect posts, notes, thoughts,
				projects, and media I care about. It runs on{' '}
				<a href="https://tanstack.com/start" target="_blank" rel="noopener noreferrer">
					TanStack Start
				</a>
				,{' '}
				<a
					href="https://developers.cloudflare.com/workers/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Cloudflare Workers
				</a>
				, and{' '}
				<a href="https://orm.drizzle.team" target="_blank" rel="noopener noreferrer">
					Drizzle ORM
				</a>{' '}
				with a D1 database.
			</p>
			<h2>Stack</h2>
			<ul>
				<li>TanStack Start + React 19 for the full-stack framework</li>
				<li>Cloudflare Workers for edge deployment</li>
				<li>D1 (SQLite) for the database</li>
				<li>Drizzle ORM for type-safe queries</li>
				<li>Tailwind CSS v4 for styling</li>
				<li>Shiki for server-side code highlighting</li>
			</ul>
			<h2>Philosophy</h2>
			<p>
				Keep it simple. Ship fast. Own your content. The entire site is a single Worker -- no CMS,
				no build-time generation, no external services. Content lives in the database, rendered
				on-demand at the edge.
			</p>
			<h2>Contact</h2>
			<p>
				Find me on GitHub or leave a message in the <a href="/guestbook">guestbook</a>.
			</p>
		</article>
	)
}
