import type { ReactNode } from 'react'
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouterState,
} from '@tanstack/react-router'
import { lazy } from 'react'

const TanStackDevtools = import.meta.env.DEV
	? lazy(() => import('@tanstack/react-devtools').then((m) => ({ default: m.TanStackDevtools })))
	: () => null

const TanStackRouterDevtoolsPanel = import.meta.env.DEV
	? lazy(() =>
			import('@tanstack/react-router-devtools').then((m) => ({
				default: m.TanStackRouterDevtoolsPanel,
			})),
		)
	: () => null
import { FloatingNav } from '~/components/floating-nav'
import { LampCordToggle } from '~/components/lamp-cord-toggle'
import { ContentWrapper } from '~/components/content-wrapper'
import { SiteFooter } from '~/components/site-footer'
import { THEME_INIT_SCRIPT } from '~/lib/theme'
import { getSiteSettings, type SiteSettings } from '~/server/functions/settings'
import appCss from '~/styles.css?url'

const SETTINGS_DEFAULTS: SiteSettings = {
	siteTitle: 'taki',
	siteDescription: 'A digital alter ego -- posts, projects, thoughts, and more.',
	footerText:
		'A digital alter ego -- posts, projects, thoughts, and more. Built with TanStack Start, deployed on Cloudflare Workers.',
	copyright: 'taki',
}

export const Route = createRootRouteWithContext()({
	loader: async () => {
		const settings = await getSiteSettings()
		return { settings }
	},
	head: ({ loaderData }) => {
		const s = loaderData?.settings ?? SETTINGS_DEFAULTS
		return {
			meta: [
				{ charSet: 'utf-8' },
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ title: s.siteTitle },
				{ name: 'description', content: s.siteDescription },
				{ httpEquiv: 'Accept-CH', content: 'Sec-CH-Prefers-Color-Scheme' },
			],
			links: [
				{ rel: 'stylesheet', href: appCss },
				{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
				{ rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
				{ rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
				{ rel: 'manifest', href: '/site.webmanifest' },
			],
		}
	},
	component: RootComponent,
	shellComponent: rootDocument,
})

/** Hide root footer on pages that render their own */
function RootFooter({ settings }: { settings: SiteSettings }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname })
	if (pathname === '/' || pathname === '/timeline') return null
	return <SiteFooter settings={settings} />
}

function RootComponent() {
	const { settings } = Route.useLoaderData()
	const pathname = useRouterState({ select: (s) => s.location.pathname })

	// Dashboard routes render their own chrome
	if (pathname.startsWith('/dashboard')) return <Outlet />

	return (
		<>
			<FloatingNav />
			<LampCordToggle />
			<ContentWrapper>
				<Outlet />
			</ContentWrapper>
			<RootFooter settings={settings} />
		</>
	)
}

function rootDocument(props: { children: ReactNode }) {
	// THEME_INIT_SCRIPT is a compile-time constant defined in ~/lib/theme, not user input
	const themeScript = THEME_INIT_SCRIPT

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className="font-sans wrap-anywhere antialiased">
				{props.children}
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
