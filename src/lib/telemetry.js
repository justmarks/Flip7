import * as Sentry from '@sentry/capacitor'
import posthog from 'posthog-js'

export function trackEvent(event, props = {}) {
  posthog.capture(event, props)
  Sentry.addBreadcrumb({ message: event, data: props, level: 'info' })
}

export function trackScreen(name) {
  posthog.capture('$pageview', { $current_url: name })
  Sentry.addBreadcrumb({ message: `screen: ${name}`, level: 'info' })
}

export function captureError(error, context = {}) {
  Sentry.captureException(error, { extra: context })
}
