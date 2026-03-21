/* src/routes/__root.tsx */

import type { ReactNode } from 'react'
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouterState,
} from '@tanstack/react-router'
import { lazy, useEffect, useState, version as reactVersion } from 'react'
import { FloatingNav } from '~/components/floating-nav'
import { ContentWrapper } from '~/components/content-wrapper'
import { NotFoundPage } from '~/components/not-found-page'
import { SiteFooter } from '~/components/site-footer'
import { LampCordToggle } from '~/components/lamp-cord-toggle'
import { THEME_INIT_SCRIPT } from '~/lib/theme'
import type { ThemePreference } from '~/lib/theme'
import { TIMEZONE_INIT_SCRIPT } from '~/lib/timezone'
import { getSiteConfig } from '~/server/config'
import { getThemeCookie } from '~/server/theme'
import { getTimezoneCookie } from '~/server/timezone'
import { resolveAssetUrl } from '~/lib/assets'
import tailwindCss from '~/styles/tailwind.css?url'
import appCss from '~/styles/index.css?url'
import noiseCss from '~/styles/noise.css?url'

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

export const Route = createRootRouteWithContext()({
	component: RootComponent,
	loader: () => getSiteConfig(),
	notFoundComponent: NotFoundPage,
	beforeLoad: async () => {
		const theme: ThemePreference =
			typeof document !== 'undefined'
				? ((document.cookie.match(/\btheme=(light|dark)\b/)?.[1] as ThemePreference | undefined) ??
					'light')
				: ((await getThemeCookie()) ?? 'light')
		const timezone: string | undefined =
			typeof document !== 'undefined'
				? (document.cookie.match(/\btimezone=([^;]+)/)?.[1] ?? undefined)
				: ((await getTimezoneCookie()) ?? undefined)
		const siteConfig = await getSiteConfig()
		return { theme, siteConfig, timezone }
	},
	head: ({ loaderData }) => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: loaderData?.title ?? 'Site Name' },
			{ name: 'description', content: loaderData?.description ?? '' },
			{ httpEquiv: 'Accept-CH', content: 'Sec-CH-Prefers-Color-Scheme' },
		],
		links: [
			{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
			{
				rel: 'stylesheet',
				href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap',
			},
			{ rel: 'stylesheet', href: tailwindCss },
			{ rel: 'stylesheet', href: appCss },
			{ rel: 'stylesheet', href: noiseCss },
			{ rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: resolveAssetUrl('favicon.svg') },
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '96x96',
				href: resolveAssetUrl('favicon-96x96.png'),
			},
			{ rel: 'apple-touch-icon', sizes: '96x96', href: resolveAssetUrl('apple-touch-icon.png') },
		],
	}),
	shellComponent: RootDocument,
})

function RootComponent() {
	const { siteConfig } = Route.useRouteContext()
	const isDashboard = useRouterState({
		select: (state) => state.location.pathname.startsWith('/~'),
	})

	useEffect(() => {
		Object.defineProperty(window, 'React', {
			value: Object.freeze({ version: reactVersion }),
			writable: false,
			configurable: false,
		})
	}, [])

	if (isDashboard) {
		return (
			<>
				<Outlet />
				<TanStackDevtools
					config={{ position: 'bottom-right' }}
					plugins={[
						{
							name: 'Tanstack Router',
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
			</>
		)
	}

	return (
		<>
			<FloatingNav />
			<LampCordToggle />
			<ContentWrapper>
				<Outlet />
			</ContentWrapper>
			<SiteFooter siteConfig={siteConfig} />
			<TanStackDevtools
				config={{ position: 'bottom-right' }}
				plugins={[
					{
						name: 'Tanstack Router',
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
		</>
	)
}

function RootDocument(props: { children: ReactNode }) {
	const themeScript = THEME_INIT_SCRIPT
	const timezoneScript = TIMEZONE_INIT_SCRIPT
	// Shell has no route context; fetch language from server fn on mount.
	const [lang, setLang] = useState('en')

	useEffect(() => {
		void getSiteConfig().then((cfg) => {
			setLang(cfg.language)
			document.documentElement.lang = cfg.language
		})
	}, [])

	return (
		<html lang={lang} suppressHydrationWarning>
			<head>
				<HeadContent />
				<script
					id="vite-plugin-meta"
					type="application/json"
					dangerouslySetInnerHTML={{
						__html:
							'{"btw":"i-use-vite-btw","blazingly-fast":true,"webpack":"no-thanks","rolldown":"yes"}',
					}}
				/>
				<script>window.___FONT_AWESOME___ = true;</script>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				<script dangerouslySetInnerHTML={{ __html: timezoneScript }} />
			</head>
			<body className="font-sans wrap-anywhere antialiased">
				{props.children}
				<Scripts />
			</body>
		</html>
	)
}
