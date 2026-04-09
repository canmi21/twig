/* src/server/presence.ts */

/* src/server/presence.ts
 *
 * Durable Object for real-time presence tracking.
 * Uses WebSocket Hibernation API — the DO sleeps between messages,
 * waking only on connect/disconnect/navigate events.
 *
 * Single global instance tracks all visitors. Per-connection metadata
 * (path, cid) is persisted in DO storage to survive hibernation.
 */

import { DurableObject } from 'cloudflare:workers'

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

export class PresenceDO extends DurableObject<Record<string, unknown>> {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env)
    // Auto-respond to pings without waking the DO
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

    // Build cid → count map
    const entries = await this.ctx.storage.list<ConnectionMeta>({
      prefix: 'ws:',
    })
    const cidCounts = new Map<string, number>()
    for (const meta of entries.values()) {
      if (meta.cid) {
        cidCounts.set(meta.cid, (cidCounts.get(meta.cid) ?? 0) + 1)
      }
    }

    // Build connectionId → cid lookup for sending targeted counts
    const idToCid = new Map<string, string | null>()
    for (const [key, meta] of entries.entries()) {
      const connectionId = key.slice(3) // strip "ws:" prefix
      idToCid.set(connectionId, meta.cid)
    }

    // Send each connection its relevant article count
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
