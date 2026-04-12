/* src/server/visitor-geo.ts */

import { getRequest } from '@tanstack/react-start/server'
import { getPresence } from '~/server/platform'
import type { VisitorGeo, GeoSwapResponse } from '~/server/presence'

const DEV_FALLBACK_GEO: VisitorGeo = { country: 'Japan', city: 'Tokyo' }

// Country codes where country name === city name (city-states).
const CITY_STATE_CODES = new Set(['SG', 'MC', 'VA', 'GI'])

interface CfGeo {
  country?: string
  city?: string
  latitude?: string | number
  longitude?: string | number
}

function getCfGeo(): CfGeo {
  return (getRequest() as { cf?: CfGeo }).cf ?? {}
}

function parseCoord(v: string | number | undefined): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function getCurrentGeo(cf: CfGeo): VisitorGeo {
  if (!cf.country) return DEV_FALLBACK_GEO

  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
  const country = regionNames.of(cf.country) ?? cf.country
  const city = cf.city ?? ''

  if (CITY_STATE_CODES.has(cf.country)) {
    return { country, city: '' }
  }

  return { country, city }
}

interface VisitorGeoResult {
  geo: VisitorGeo
  tiles: Record<string, number>
}

/** Swap last visitor geo and increment heat tile.
 *  Returns the previous visitor's geo and all tile counts. */
export async function swapVisitorGeo(): Promise<VisitorGeoResult> {
  const cf = getCfGeo()
  const current = getCurrentGeo(cf)
  const lat = parseCoord(cf.latitude)
  const lon = parseCoord(cf.longitude)

  try {
    const binding = getPresence()
    const id = binding.idFromName('global')
    const stub = binding.get(id)

    const res = await stub.fetch('https://do-internal/last-geo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...current, lat, lon }),
    })
    const data = (await res.json()) as GeoSwapResponse
    return {
      geo: data.previousGeo ?? current,
      tiles: data.tiles,
    }
  } catch {
    // DO not available in local dev
    return { geo: current, tiles: {} }
  }
}
