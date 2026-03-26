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
import { getCdnPublicUrl } from '~/server/get-cdn-url'
import { getPublicUrlFn } from '~/server/get-public-url'
import { getInitialTheme } from '~/server/get-initial-theme'
import { themeScript } from '~/lib/theme/theme-script'
import { ThemeToggle } from '~/components/theme-toggle'
import { SITE_TITLE, SITE_DESCRIPTION } from '~/lib/content/metadata'
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
    ],
    scripts: [
      {
        src: 'https://cloud.umami.is/script.js',
        'data-website-id': '2b0a1e79-405a-47c0-a263-05732e0a130c',
        defer: true,
      },
      {
        children: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "w1qyo3ct84");`,
      },
      {
        src: 'https://www.googletagmanager.com/gtag/js?id=G-JSSDP56B0P',
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-JSSDP56B0P');`,
      },
    ],
    links: [
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
    return { cdnPublicUrl, canonicalUrl, initialTheme }
  },
  component: RootComponent,
})

function RootComponent() {
  const { initialTheme, canonicalUrl } = useRouteContext({ from: '__root__' })
  return (
    <RootDocument initialTheme={initialTheme} canonicalUrl={canonicalUrl}>
      <Outlet />
    </RootDocument>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `Object.defineProperty(window,'React',{value:Object.freeze({version:"${reactVersion}"}),writable:false,configurable:false});window.___FONT_AWESOME___=true;`,
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
        <ThemeToggle />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
