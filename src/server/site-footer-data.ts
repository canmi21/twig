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
}

function clampWorldMapLatCenter(lat: number): number {
  const margin = WORLD_MAP_LAT_SPAN / 2
  return Math.max(-90 + margin, Math.min(90 - margin, lat))
}

function getVisitorLatCenter(): number {
  const cf = (getRequest() as { cf?: { latitude?: string | number } }).cf
  const latitude =
    typeof cf?.latitude === 'number'
      ? cf.latitude
      : Number.parseFloat(cf?.latitude ?? '')

  return clampWorldMapLatCenter(
    Number.isFinite(latitude) ? latitude : FALLBACK_WORLD_MAP_LAT_CENTER,
  )
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

  return {
    accountName,
    runtimeDays,
    copyrightYear: new Date(now).getFullYear(),
    presenceCount: Math.max(1, presence.global + 1),
    worldMapOffset,
    worldMapLatCenter: getVisitorLatCenter(),
  }
}
