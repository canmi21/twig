import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
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
import { ContentWrapper } from '~/components/content-wrapper'
import { SiteFooter } from '~/components/site-footer'
import { LampCordToggle } from '~/components/lamp-cord-toggle'
import { THEME_INIT_SCRIPT } from '~/lib/theme'
import appCss from '~/styles.css?url'

interface SiteSettings {
	siteTitle: string
	siteDescription: string
	footerText: string
	copyright: string
}

const SETTINGS_DEFAULTS: SiteSettings = {
	siteTitle: 'taki',
	siteDescription: 'A digital alter ego -- posts, projects, thoughts, and more.',
	footerText:
		'A digital alter ego -- posts, projects, thoughts, and more. Built with TanStack Start, deployed on Cloudflare Workers.',
	copyright: 'taki',
}

export const Route = createRootRouteWithContext()({
	head: () => {
		const s = SETTINGS_DEFAULTS
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

function RootComponent() {
	const s = SETTINGS_DEFAULTS

	return (
		<>
			<FloatingNav />
			<LampCordToggle />
			<ContentWrapper>
				<Outlet />
			</ContentWrapper>
			<SiteFooter settings={s} />
		</>
	)
}

function rootDocument(props: { children: ReactNode }) {
	// THEME_INIT_SCRIPT is a compile-time constant, safe for inline use
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
