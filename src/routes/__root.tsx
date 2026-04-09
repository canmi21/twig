/* src/routes/__root.tsx */

import { version as reactVersion } from 'react'
import type { ReactNode } from 'react'
import {
  Outlet,
  HeadContent,
  Scripts,
  useRouteContext,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import type { RootContext } from '~/router'
import { getCdnPublicUrl, getPublicUrlFn } from '~/server/server-fns'
import { getInitialTheme } from '~/server/get-initial-theme'
import { themeScript } from '~/lib/theme/theme-script'
import { SITE_TITLE, SITE_DESCRIPTION } from '~/lib/content/metadata'
import { fontFallbackScript } from '~/lib/theme/font-fallback-script'
import { AppErrorBoundary } from '~/lib/sentry'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<RootContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: SITE_TITLE },
      { name: 'description', content: SITE_DESCRIPTION },
      { name: 'baidu-site-verification', content: 'codeva-vxytO6KmID' },
      { property: 'og:site_name', content: SITE_TITLE },
      { property: 'og:locale', content: 'zh_CN' },
    ],
    scripts: [
      {
        src: 'https://cloud.umami.is/script.js',
        'data-website-id': '2b0a1e79-405a-47c0-a263-05732e0a130c',
        'data-before-send': 'umamiBeforeSend',
        defer: true,
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300&family=Noto+Sans+SC:wght@100..900&family=Roboto:ital,wght@0,100..900;1,100..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
        sizes: 'any',
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon-96x96.png',
        sizes: '96x96',
      },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const [cdnPublicUrl, initialTheme, publicUrl] = await Promise.all([
      getCdnPublicUrl(),
      getInitialTheme(),
      getPublicUrlFn(),
    ])
    const canonicalUrl = `${publicUrl}${location.pathname}`
    return { cdnPublicUrl, publicUrl, canonicalUrl, initialTheme }
  },
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const { initialTheme, canonicalUrl } = useRouteContext({ from: '__root__' })

  return (
    <RootDocument initialTheme={initialTheme} canonicalUrl={canonicalUrl}>
      <AppErrorBoundary fallback={<SentryFallback />}>
        <Outlet />
      </AppErrorBoundary>
    </RootDocument>
  )
}

function SentryFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <span className="text-sm text-secondary">Something went wrong.</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <span className="text-xl font-medium">404</span>
      <span className="mx-4 h-8 w-px bg-border" />
      <span className="text-sm text-secondary">Not Found</span>
    </div>
  )
}

function RootDocument({
  children,
  initialTheme,
  canonicalUrl,
}: Readonly<{
  children: ReactNode
  initialTheme: RootContext['initialTheme']
  canonicalUrl: string
}>) {
  return (
    <html
      lang="zh"
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={initialTheme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
        <link rel="canonical" href={canonicalUrl} />
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: fontFallbackScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.defineProperty(window,'React',{value:Object.freeze({version:"${reactVersion}"}),writable:false,configurable:false});window.___FONT_AWESOME___=true;window.umamiBeforeSend=function(t,p){return p.url&&p.url.startsWith("/@/")?false:p};`,
          }}
        />
        <script
          id="vite-plugin-meta"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html:
              '{"btw":"i-use-vite-btw","blazingly-fast":true,"webpack":"no-thanks","rolldown":"yes"}',
          }}
        />
      </head>
      <body className="bg-surface text-primary">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
