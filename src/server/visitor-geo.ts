/* src/server/visitor-geo.ts */

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getPresence } from '~/server/platform'
import type { VisitorGeo } from '~/server/presence'

const DEV_FALLBACK_GEO: VisitorGeo = { country: 'Japan', city: 'Tokyo' }

// Country codes where country name === city name (city-states).
const CITY_STATE_CODES = new Set(['SG', 'MC', 'VA', 'GI'])

function getCurrentGeo(): VisitorGeo {
  const cf = (getRequest() as { cf?: { country?: string; city?: string } }).cf
  if (!cf?.country) return DEV_FALLBACK_GEO

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
  const country = regionNames.of(cf.country) ?? cf.country
  const city = cf.city ?? ''

  if (CITY_STATE_CODES.has(cf.country)) {
    return { country, city: '' }
  }

  return { country, city }
}

/** Swap last visitor geo: returns the previously stored geo and
 *  overwrites it with the current request's geo. */
export const swapVisitorGeo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<VisitorGeo> => {
    const current = getCurrentGeo()

    try {
      const binding = getPresence()
      const id = binding.idFromName('global')
      const stub = binding.get(id)

      const res = await stub.fetch('https://do-internal/last-geo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(current),
      })
      const previous = (await res.json()) as VisitorGeo | null
      return previous ?? current
    } catch {
      // DO not available in local dev
      return current
    }
  },
)
