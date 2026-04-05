/* src/lib/sentry.ts */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import type * as SentryReact from '@sentry/react'

type SentryModule = typeof SentryReact

const sentryDsn =
  'https://e554a978139c602f117d1a310fb4a8e2@o4511131162116096.ingest.us.sentry.io/4511131164868608'

const shouldLoadSentry =
  typeof window !== 'undefined' && import.meta.env.PROD && sentryDsn.length > 0

let sentryInitPromise: Promise<SentryModule> | null = null
let sentryInitialized = false

async function loadSentry(): Promise<SentryModule> {
  if (!sentryInitPromise) {
    sentryInitPromise = import('@sentry/react').then((Sentry) => {
      if (!sentryInitialized) {
        Sentry.init({
          dsn: sentryDsn,
          sendDefaultPii: true,
          ignoreErrors: [
            // Network failures from third-party scripts (analytics, ads, etc.)
            'Failed to fetch',
            'NetworkError',
            'Load failed',
            // Browser extensions
            /^chrome-extension:\/\//,
            /^moz-extension:\/\//,
          ],
          denyUrls: [
            // Analytics and tracking services
            /umami\.(is|dev)/,
            /clarity\.ms/,
            /google-analytics\.com/,
            /googletagmanager\.com/,
            /cdn-cgi\//,
          ],
        })
        sentryInitialized = true
      }

      return Sentry
    })
  }

  return sentryInitPromise
}

if (shouldLoadSentry) {
  void loadSentry()
}

type AppErrorBoundaryProps = Readonly<{
  children: ReactNode
  fallback: ReactNode
}>

type AppErrorBoundaryState = Readonly<{
  hasError: boolean
}>

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!shouldLoadSentry) {
      return
    }

    void loadSentry().then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setContext('react', {
          componentStack: errorInfo.componentStack,
        })
        Sentry.captureException(error)
      })
    })
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export { AppErrorBoundary }
