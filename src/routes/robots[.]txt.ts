/* src/routes/robots[.]txt.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getPublicUrl } from '~/server/platform'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          '# https://www.robotstxt.org/robotstxt.html',
          'User-agent: *',
          'Disallow: /@/',
          'Disallow: /cgi-bin/',
          'Disallow: /cdn-cgi/',
          `Sitemap: ${getPublicUrl()}/sitemap.xml`,
          '',
        ].join('\n')

        return new Response(body, {
          headers: { 'content-type': 'text/plain' },
        })
      },
    },
  },
})
