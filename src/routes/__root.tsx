import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { renderAppShell } from '~/components/app-shell'
import { THEME_INIT_SCRIPT } from '~/lib/theme'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'taki',
			},
			{
				name: 'description',
				content: 'TanStack Start + TailwindCSS + Drizzle + Cloudflare Worker starter.',
			},
			{
				httpEquiv: 'Accept-CH',
				content: 'Sec-CH-Prefers-Color-Scheme',
			},
		],
		links: [
			{
				rel: 'stylesheet',
				href: appCss,
			},
		],
	}),
	shellComponent: rootDocument,
})

function rootDocument(props: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				{/* Static script derived from compile-time constant; no user input involved */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body className="font-sans wrap-anywhere antialiased">
				{renderAppShell(props.children)}
				<TanStackDevtools
					config={{
						position: 'bottom-right',
					}}
					plugins={[
						{
							name: 'Tanstack Router',
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	)
}
