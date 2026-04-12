/* src/server/presence.ts */

/* Durable Object for audience tracking.
 * Uses WebSocket Hibernation API — the DO sleeps between messages,
 * waking only on connect/disconnect/navigate events.
 *
 * Single global instance tracks all visitors (presence) and stores
 * the last visitor's geolocation for display on the homepage.
 */

import { DurableObject } from 'cloudflare:workers'
import { geoToTileIndex } from '~/lib/geo-tile'

interface ConnectionMeta {
  path: string
  cid: string | null
}

interface ClientMessage {
  type: 'init' | 'navigate'
  path: string
  cid?: string | null
}

interface PresenceMessage {
  type: 'presence'
  global: number
  article: number
}

export interface VisitorGeo {
  country: string
  city: string
}

interface VisitorGeoRequest extends VisitorGeo {
  lat?: number
  lon?: number
}

export interface GeoSwapResponse {
  previousGeo: VisitorGeo | null
  tiles: Record<string, number>
}

const LAST_GEO_KEY = 'last-geo'
const VISIT_COUNT_KEY = 'visit-count'
const TILE_PREFIX = 'tile:'

// Exported as `actor` to match wrangler.jsonc class_name.
// Cloudflare dashboard shows "taki-actor".
// oxlint-disable-next-line typescript/class-name -- wrangler class_name binding
export class actor extends DurableObject<Record<string, unknown>> {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env)
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    )
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // HTTP count query (used by SSR loaders)
    if (url.pathname === '/count') {
      const cid = url.searchParams.get('cid')
      const counts = await this.computeCounts(cid)
      return Response.json(counts)
    }

    // Increment site-wide visit counter and return total
    if (url.pathname === '/visit' && request.method === 'POST') {
      const prev = (await this.ctx.storage.get<number>(VISIT_COUNT_KEY)) ?? 0
      const next = prev + 1
      await this.ctx.storage.put(VISIT_COUNT_KEY, next)
      return Response.json({ totalVisits: next })
    }

    // Seed visit counter to an absolute value (one-time admin use)
    if (url.pathname === '/visit' && request.method === 'PUT') {
      const { count } = (await request.json()) as { count: number }
      await this.ctx.storage.put(VISIT_COUNT_KEY, count)
      return Response.json({ totalVisits: count })
    }

    // Swap last visitor geo + increment heat tile.
    // Atomic within a single DO instance — no race conditions.
    if (url.pathname === '/last-geo' && request.method === 'POST') {
      const incoming = (await request.json()) as VisitorGeoRequest
      const stored = await this.ctx.storage.get<VisitorGeo>(LAST_GEO_KEY)
      await this.ctx.storage.put(LAST_GEO_KEY, {
        country: incoming.country,
        city: incoming.city,
      } satisfies VisitorGeo)

      // Increment the visitor's heat tile if coordinates are available
      if (
        typeof incoming.lat === 'number' &&
        typeof incoming.lon === 'number' &&
        Number.isFinite(incoming.lat) &&
        Number.isFinite(incoming.lon)
      ) {
        const idx = geoToTileIndex(incoming.lon, incoming.lat)
        const key = `${TILE_PREFIX}${idx}`
        const prev = (await this.ctx.storage.get<number>(key)) ?? 0
        await this.ctx.storage.put(key, prev + 1)
      }

      // Return all heat tiles (only non-zero entries stored)
      const tileEntries = await this.ctx.storage.list<number>({
        prefix: TILE_PREFIX,
      })
      const tiles: Record<string, number> = {}
      for (const [key, count] of tileEntries) {
        tiles[key.slice(TILE_PREFIX.length)] = count
      }

      return Response.json({
        previousGeo: stored ?? null,
        tiles,
      } satisfies GeoSwapResponse)
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket or /count', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    const connectionId = crypto.randomUUID().slice(0, 8)

    this.ctx.acceptWebSocket(server, [connectionId])

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return

    let msg: ClientMessage
    try {
      msg = JSON.parse(message)
    } catch {
      return
    }

    if (msg.type !== 'init' && msg.type !== 'navigate') return

    const tags = this.ctx.getTags(ws)
    const connectionId = tags[0]
    if (!connectionId) return

    const meta: ConnectionMeta = {
      path: msg.path,
      cid: msg.cid ?? null,
    }

    await this.ctx.storage.put(`ws:${connectionId}`, meta)
    await this.broadcastCounts()
  }

  async webSocketClose(ws: WebSocket) {
    const tags = this.ctx.getTags(ws)
    const connectionId = tags[0]
    if (connectionId) {
      await this.ctx.storage.delete(`ws:${connectionId}`)
    }
    await this.broadcastCounts()
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws)
  }

  private async computeCounts(
    targetCid?: string | null,
  ): Promise<{ global: number; article: number }> {
    const global = this.ctx.getWebSockets().length
    let article = 0

    if (targetCid) {
      const entries = await this.ctx.storage.list<ConnectionMeta>({
        prefix: 'ws:',
      })
      for (const meta of entries.values()) {
        if (meta.cid === targetCid) article++
      }
    }

    return { global, article }
  }

  private async broadcastCounts() {
    const sockets = this.ctx.getWebSockets()
    const global = sockets.length

    const entries = await this.ctx.storage.list<ConnectionMeta>({
      prefix: 'ws:',
    })
    const cidCounts = new Map<string, number>()
    for (const meta of entries.values()) {
      if (meta.cid) {
        cidCounts.set(meta.cid, (cidCounts.get(meta.cid) ?? 0) + 1)
      }
    }

    const idToCid = new Map<string, string | null>()
    for (const [key, meta] of entries.entries()) {
      const connectionId = key.slice(3)
      idToCid.set(connectionId, meta.cid)
    }

    for (const ws of sockets) {
      const tags = this.ctx.getTags(ws)
      const connectionId = tags[0]
      const cid = connectionId ? idToCid.get(connectionId) : null
      const article = cid ? (cidCounts.get(cid) ?? 0) : 0

      const msg: PresenceMessage = { type: 'presence', global, article }
      try {
        ws.send(JSON.stringify(msg))
      } catch {
        // Connection already closed
      }
    }
  }
}
