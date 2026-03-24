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
import { getTheme } from '~/server/get-theme'
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
      { title: 'Taki' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
    scripts: [{ children: themeScript }],
  }),
  beforeLoad: async () => {
    const [cdnPublicUrl, theme] = await Promise.all([
      getCdnPublicUrl(),
      getTheme(),
    ])
    return { cdnPublicUrl, theme }
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
  const { theme } = Route.useRouteContext()
  return (
    <html
      lang="zh-Hans"
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- dark mode strategy class, not a Tailwind utility
      className={theme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="bg-surface text-on-surface">
        <ThemeToggle />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
