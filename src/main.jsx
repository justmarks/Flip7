import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/capacitor'
import * as SentryReact from '@sentry/react'
import posthog from 'posthog-js'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'
import { ErrorFallback } from './components/ErrorFallback.jsx'
import { trackEvent } from './lib/telemetry.js'

Sentry.init(
  { dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 1.0 },
  SentryReact.init
)

if (import.meta.env.VITE_POSTHOG_TOKEN) {
  posthog.init(import.meta.env.VITE_POSTHOG_TOKEN, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: false,
  })
}

trackEvent('app_started', {
  version: __APP_VERSION__,
  platform: Capacitor.getPlatform(),
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SentryReact.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </SentryReact.ErrorBoundary>
  </StrictMode>,
)
