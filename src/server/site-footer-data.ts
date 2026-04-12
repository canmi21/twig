/* src/server/site-footer-data.ts */

import { getRequest, getRequestHeaders } from '@tanstack/react-start/server'
import { getAuth } from './better-auth'
import { getPresenceCount } from './presence-count'
import { FOOTER_MAP_SPEED_DEG_PER_SEC } from '~/components/footer-world-map'

const SITE_STARTED_AT = '2024-10-11T06:24:59+08:00'
const FALLBACK_WORLD_MAP_LAT_CENTER = 36
const WORLD_MAP_LAT_SPAN = 105

export interface SiteFooterData {
  accountName: string
  runtimeDays: number
  copyrightYear: number
  presenceCount: number
  worldMapOffset: number
  worldMapLatCenter: number
  visitorLat: number | null
  visitorLon: number | null
}

function clampWorldMapLatCenter(lat: number): number {
  const margin = WORLD_MAP_LAT_SPAN / 2
  return Math.max(-90 + margin, Math.min(90 - margin, lat))
}

function parseCfCoord(v: string | number | undefined): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function getVisitorCoords(): {
  latCenter: number
  lat: number | null
  lon: number | null
} {
  const cf = (
    getRequest() as {
      cf?: { latitude?: string | number; longitude?: string | number }
    }
  ).cf
  const lat = parseCfCoord(cf?.latitude)
  const lon = parseCfCoord(cf?.longitude)

  return {
    latCenter: clampWorldMapLatCenter(lat ?? FALLBACK_WORLD_MAP_LAT_CENTER),
    lat,
    lon,
  }
}

export async function getSiteFooterData(): Promise<SiteFooterData> {
  const session = await getAuth().api.getSession({
    headers: getRequestHeaders(),
  })
  const now = Date.now()
  const runtimeDays = Math.max(
    0,
    Math.floor((now - new Date(SITE_STARTED_AT).getTime()) / 86400000),
  )
  const accountName =
    (session?.user.name as string | undefined) ||
    (session?.user.email as string | undefined) ||
    'Guest'
  const presence = await getPresenceCount({ data: {} })
  const worldMapOffset =
    ((((now / 1000) * FOOTER_MAP_SPEED_DEG_PER_SEC) % 360) + 360) % 360
  const visitor = getVisitorCoords()

  return {
    accountName,
    runtimeDays,
    copyrightYear: new Date(now).getFullYear(),
    presenceCount: Math.max(1, presence.global + 1),
    worldMapOffset,
    worldMapLatCenter: visitor.latCenter,
    visitorLat: visitor.lat,
    visitorLon: visitor.lon,
  }
}
