/* src/lib/presence/use-presence.ts */

/* src/lib/presence/use-presence.ts
 *
 * Client-side React hook for real-time presence tracking.
 * Opens a WebSocket to the PresenceDO, reports current path/cid,
 * and receives live presence count updates.
 */

import { useState, useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'

// Reconnect backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s
const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30_000
const BACKOFF_FACTOR = 2

// Heartbeat cadence. Must be sent as the literal string "ping" (not JSON)
// so the DO's `setWebSocketAutoResponse('ping','pong')` intercepts it
// without waking the Durable Object.
const HEARTBEAT_INTERVAL_MS = 21_000

interface PresenceOptions {
  cid?: string
  initialGlobal?: number
  initialArticle?: number
}

interface PresenceState {
  global: number
  article: number
}

interface ServerMessage {
  type: 'presence'
  global: number
  article: number
}

export function usePresence(options?: PresenceOptions): PresenceState {
  const { cid, initialGlobal = 0, initialArticle = 0 } = options ?? {}
  const [state, setState] = useState<PresenceState>({
    global: initialGlobal,
    article: initialArticle,
  })

  const location = useLocation()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const cidRef = useRef(cid)
  const mountedRef = useRef(true)

  // Keep cid ref in sync for the connect handler
  useEffect(() => {
    cidRef.current = cid
  }, [cid])

  useEffect(() => {
    if (typeof window === 'undefined') return

    mountedRef.current = true

    function stopHeartbeat() {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
        heartbeatTimer.current = null
      }
    }

    function connect() {
      if (wsRef.current) return

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
      wsRef.current = ws

      ws.addEventListener('open', () => {
        reconnectDelay.current = INITIAL_RECONNECT_DELAY
        ws.send(
          JSON.stringify({
            type: 'init',
            path: window.location.pathname,
            cid: cidRef.current ?? null,
          }),
        )
        stopHeartbeat()
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Literal string — intercepted by DO's auto-response, never
            // JSON-parsed on the server.
            ws.send('ping')
          }
        }, HEARTBEAT_INTERVAL_MS)
      })

      ws.addEventListener('message', (event) => {
        const data = event.data as string
        // Ignore the heartbeat echo from the DO auto-response.
        if (data === 'pong') return
        try {
          const msg = JSON.parse(data) as ServerMessage
          if (msg.type === 'presence' && mountedRef.current) {
            setState({ global: msg.global, article: msg.article })
          }
        } catch {
          // Ignore malformed messages
        }
      })

      ws.addEventListener('close', () => {
        wsRef.current = null
        stopHeartbeat()
        if (!mountedRef.current) return

        const delay = reconnectDelay.current
        reconnectDelay.current = Math.min(
          delay * BACKOFF_FACTOR,
          MAX_RECONNECT_DELAY,
        )
        reconnectTimer.current = setTimeout(connect, delay)
      })

      ws.addEventListener('error', () => {
        // Close event fires after error, triggering reconnect + heartbeat stop
      })
    }

    connect()

    return () => {
      mountedRef.current = false
      stopHeartbeat()
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  // Send navigate message on path or cid change
  useEffect(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(
      JSON.stringify({
        type: 'navigate',
        path: location.pathname,
        cid: cidRef.current ?? null,
      }),
    )
  }, [location.pathname, cid])

  return state
}
