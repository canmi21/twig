/* src/routes/api/sentences.ts */

import { createFileRoute } from '@tanstack/react-router'
import { getRandomSentence } from '~/lib/sentences/hitokoto'

export const Route = createFileRoute('/api/sentences')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sentence = await getRandomSentence()

          return Response.json(
            {
              hitokoto: sentence.hitokoto,
              from_who: sentence.fromWho,
            },
            {
              headers: {
                'cache-control': 'no-store',
              },
            },
          )
        } catch {
          return Response.json(
            { error: 'Failed to load sentences' },
            { status: 502 },
          )
        }
      },
    },
  },
})
