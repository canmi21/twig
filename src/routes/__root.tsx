import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { FloatingNav } from '~/components/floating-nav'
import { LampCordToggle } from '~/components/lamp-cord-toggle'
import { ContentWrapper } from '~/components/content-wrapper'
import { SiteFooter } from '~/components/site-footer'
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
				content: 'A digital alter ego -- posts, projects, thoughts, and more.',
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

/** Hide root footer on pages that render their own */
function RootFooter() {
	const pathname = useRouterState({ select: (s) => s.location.pathname })
	if (pathname === '/' || pathname === '/timeline') return null
	return <SiteFooter />
}

function rootDocument(props: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				{/* THEME_INIT_SCRIPT is a compile-time constant, not user input */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body className="font-sans wrap-anywhere antialiased">
				<FloatingNav />
				<LampCordToggle />
				<ContentWrapper>{props.children}</ContentWrapper>
				<RootFooter />
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
