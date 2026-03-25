/* src/routes/__root.tsx */

import type { ReactNode } from 'react'
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import type { RootContext } from '~/router'
import { getCdnPublicUrl } from '~/server/get-cdn-url'
import { themeScript } from '~/lib/theme/theme-script'
import { ThemeToggle } from '~/components/theme-toggle'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<RootContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'サボり記' },
      { name: 'description', content: '蛋糕是一个谎言！' },
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
  beforeLoad: async () => {
    const cdnPublicUrl = await getCdnPublicUrl()
    return { cdnPublicUrl }
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  // Read the class that the inline head script already set on <html>.
  // This makes React's virtual DOM match the real DOM so hydration
  // does not strip the dark class.
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  return (
    <html
      lang="zh"
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={isDark ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
        <HeadContent />
      </head>
      <body className="bg-surface text-primary">
        <ThemeToggle />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
