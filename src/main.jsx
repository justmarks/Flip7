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
import { getBggCredentials } from './lib/bgg.js'

Sentry.init(
  { dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 1.0 },
  SentryReact.init
)

const platform = Capacitor.getPlatform()

Sentry.setTag('platform', platform)

const POSTHOG_TOKEN = import.meta.env.VITE_POSTHOG_TOKEN || 'phc_SsRctUzNbEfMT9Vo2rH02sSslCqMCdlg6NU8l5PEHL7'

posthog.init(POSTHOG_TOKEN, {
  api_host: 'https://us.i.posthog.com',
  capture_pageview: false,
})
posthog.register({ platform })

getBggCredentials().then(creds => {
  trackEvent('app_started', {
    version: __APP_VERSION__,
    ...(creds?.username && { bgg_username: creds.username }),
  })
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SentryReact.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </SentryReact.ErrorBoundary>
  </StrictMode>,
)
