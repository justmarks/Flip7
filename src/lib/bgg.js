import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp, CapacitorCookies, Capacitor } from '@capacitor/core'

const CREDENTIALS_KEY = 'flip7_bgg_credentials'
const MAPPINGS_KEY = 'flip7_bgg_mappings'
const PUBLISHED_KEY = 'flip7_bgg_published'
const SESSION_KEY = 'flip7_bgg_session'
const MAX_PUBLISHED = 200

const IS_NATIVE = Capacitor.isNativePlatform()
const BGG_PROXY_URL = import.meta.env.VITE_BGG_PROXY_URL?.replace(/\/$/, '')

const BGG_BASE = import.meta.env.DEV
  ? '/bgg'                        // Vite dev server proxies /bgg/* → boardgamegeek.com
  : IS_NATIVE
    ? 'https://boardgamegeek.com' // CapacitorHttp on Android makes native requests, bypassing CORS
    : BGG_PROXY_URL || 'https://boardgamegeek.com' // Web: Cloudflare Worker proxy

const LOGIN_URL = `${BGG_BASE}/login/api/v1`
const GEEKPLAY_URL = `${BGG_BASE}/geekplay.php`
const FLIP7_BGG_ID = '420087'

// Web proxy session helpers — BGG cookies can't be stored in the browser cross-domain,
// so the worker relays them as X-BGG-Session which we store in Preferences.
async function getStoredSession() {
  try {
    const { value } = await Preferences.get({ key: SESSION_KEY })
    return value
  } catch { return null }
}
async function storeSession(session) {
  try { await Preferences.set({ key: SESSION_KEY, value: session }) } catch {}
}
async function clearStoredSession() {
  try { await Preferences.remove({ key: SESSION_KEY }) } catch {}
}

// ---------------------------------------------------------------------------
// Credentials storage
// ---------------------------------------------------------------------------

/** @returns {{ username: string } | null} */
export async function getBggCredentials() {
  try {
    const { value } = await Preferences.get({ key: CREDENTIALS_KEY })
    if (value) return JSON.parse(value)
  } catch {}
  return null
}

/** @param {{ username: string }} creds — password is never persisted */
export async function saveBggCredentials({ username }) {
  try {
    await Preferences.set({ key: CREDENTIALS_KEY, value: JSON.stringify({ username }) })
  } catch {}
}

export async function clearBggCredentials() {
  try {
    await Preferences.remove({ key: CREDENTIALS_KEY })
    if (IS_NATIVE) {
      await CapacitorCookies.clearCookies({ url: 'https://boardgamegeek.com' })
    } else {
      await clearStoredSession()
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Player → BGG username mappings
// { [localNameLower: string]: string }
// ---------------------------------------------------------------------------

/** @returns {Record<string, string>} */
export async function getBggMappings() {
  try {
    const { value } = await Preferences.get({ key: MAPPINGS_KEY })
    if (value) return JSON.parse(value)
  } catch {}
  return {}
}

/** @param {Record<string, string>} mappings */
export async function saveBggMappings(mappings) {
  try {
    await Preferences.set({ key: MAPPINGS_KEY, value: JSON.stringify(mappings) })
  } catch {}
}

// ---------------------------------------------------------------------------
// Published game deduplication
// ---------------------------------------------------------------------------

/** @param {string} gameId */
export async function isGamePublished(gameId) {
  try {
    const { value } = await Preferences.get({ key: PUBLISHED_KEY })
    if (value) {
      const list = JSON.parse(value)
      return list.includes(String(gameId))
    }
  } catch {}
  return false
}

/** @param {string} gameId */
export async function markGamePublished(gameId) {
  try {
    const { value } = await Preferences.get({ key: PUBLISHED_KEY })
    const list = value ? JSON.parse(value) : []
    list.unshift(String(gameId))
    if (list.length > MAX_PUBLISHED) list.length = MAX_PUBLISHED
    await Preferences.set({ key: PUBLISHED_KEY, value: JSON.stringify(list) })
  } catch {}
}

// ---------------------------------------------------------------------------
// Credential verification
// ---------------------------------------------------------------------------

/** @returns {Promise<{ ok: boolean, error?: string }>} */
export async function verifyBggCredentials({ username, password }) {
  // Web production path: route through Cloudflare Worker proxy (CORS bypass)
  if (BGG_PROXY_URL && !IS_NATIVE && !import.meta.env.DEV) {
    console.log('[BGG] verifyBggCredentials: using proxy', LOGIN_URL)
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: { username, password } }),
      })
      console.log('[BGG] verifyBggCredentials proxy status:', res.status)
      if (res.ok || res.status === 204) {
        const session = res.headers.get('X-BGG-Session')
        if (session) await storeSession(session)
        return { ok: true }
      }
      const debug = res.headers.get('X-BGG-Debug') ?? ''
      return { ok: false, error: `Login failed. (${res.status}) ${debug}`.trim() }
    } catch (err) {
      console.error('[BGG] verifyBggCredentials proxy error:', err)
      return { ok: false, error: 'Network error. Check your connection and try again.' }
    }
  }

  console.log('[BGG] verifyBggCredentials: trying CapacitorHttp', LOGIN_URL)
  try {
    const loginRes = await CapacitorHttp.post({
      url: LOGIN_URL,
      headers: { 'Content-Type': 'application/json' },
      data: { credentials: { username, password } },
      responseType: 'text', // avoid JSON-parse throw on empty 204 body
    })
    console.log('[BGG] verifyBggCredentials CapacitorHttp status:', loginRes.status, 'headers:', loginRes.headers)
    if (loginRes.status === 200 || loginRes.status === 204) return { ok: true }
    return { ok: false, error: 'Invalid BGG username or password.' }
  } catch (capErr) {
    console.warn('[BGG] verifyBggCredentials CapacitorHttp error:', capErr)
    // CapacitorHttp not available — fall back to fetch
  }
  console.log('[BGG] verifyBggCredentials: trying fetch fallback')
  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials: { username, password } }),
    })
    console.log('[BGG] verifyBggCredentials fetch status:', res.status)
    if (res.ok) return { ok: true }
    return { ok: false, error: 'Invalid BGG username or password.' }
  } catch (fetchErr) {
    console.error('[BGG] verifyBggCredentials fetch error:', fetchErr)
    return { ok: false, error: 'Network error. Check your connection and try again.' }
  }
}

// ---------------------------------------------------------------------------
// BGG play submission
// Uses the internal geekplay.php endpoint (session-cookie auth via login API).
// Note: this is an unofficial endpoint used by all major BGG companion apps.
// ---------------------------------------------------------------------------

/**
 * Session cookies from the last successful verifyBggCredentials are stored in the
 * native cookie store (CapacitorHttp / WebView CookieManager) and sent automatically.
 * The password is never re-used here — if the session expires BGG returns an error.
 *
 * @param {{
 *   players: Array<{ name: string, bggUsername: string|null, score: number, isWinner: boolean }>,
 *   playdate: string,  // 'YYYY-MM-DD'
 * }} param
 * @returns {Promise<{ success: boolean, playId?: number, error?: string }>}
 */
export async function submitBggPlay({ players, playdate }) {
  // Build URL-encoded play body
  const fields = {
    ajax: '1',
    action: 'save',
    objectid: FLIP7_BGG_ID,
    objecttype: 'thing',
    playdate,
    quantity: '1',
    length: '0',
  }
  players.forEach((p, i) => {
    fields[`players[${i}][name]`] = p.name
    fields[`players[${i}][score]`] = String(p.score)
    fields[`players[${i}][win]`] = p.isWinner ? '1' : '0'
    fields[`players[${i}][new]`] = '0'
    if (p.bggUsername) fields[`players[${i}][username]`] = p.bggUsername
  })
  const body = Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  // Web production path: route through Cloudflare Worker proxy
  if (BGG_PROXY_URL && !IS_NATIVE && !import.meta.env.DEV) {
    console.log('[BGG] submitBggPlay: using proxy', GEEKPLAY_URL)
    try {
      const session = await getStoredSession()
      const res = await fetch(GEEKPLAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(session && { 'X-BGG-Session': session }),
        },
        body,
      })
      console.log('[BGG] submitBggPlay proxy status:', res.status)
      const json = await res.json()
      console.log('[BGG] submitBggPlay proxy response:', json)
      if (json?.playid) return { success: true, playId: json.playid }
      if (json?.error) return { success: false, error: json.error }
      return { success: false, error: 'Unexpected response from BGG.' }
    } catch (err) {
      console.error('[BGG] submitBggPlay proxy error:', err)
      return { success: false, error: 'Network error. Check your connection and try again.' }
    }
  }

  // Try CapacitorHttp first — session cookies from last login are sent automatically
  console.log('[BGG] submitBggPlay: trying CapacitorHttp', GEEKPLAY_URL, 'players:', players.length, 'date:', playdate)
  try {
    const playRes = await CapacitorHttp.post({
      url: GEEKPLAY_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: body,
    })
    console.log('[BGG] submitBggPlay CapacitorHttp status:', playRes.status, 'data:', playRes.data)
    const json = typeof playRes.data === 'string' ? JSON.parse(playRes.data) : playRes.data
    if (json?.playid) {
      console.log('[BGG] submitBggPlay success, playId:', json.playid)
      return { success: true, playId: json.playid }
    }
    if (json?.error) {
      console.warn('[BGG] submitBggPlay BGG error:', json.error)
      return { success: false, error: json.error }
    }
    console.warn('[BGG] submitBggPlay unexpected response:', json)
    return { success: false, error: 'Unexpected response from BGG.' }
  } catch (capErr) {
    console.warn('[BGG] submitBggPlay CapacitorHttp error:', capErr)
    // Fall through to fetch fallback
  }

  // fetch fallback — session cookies from last login are sent via credentials: 'include'
  console.log('[BGG] submitBggPlay: trying fetch fallback', GEEKPLAY_URL)
  try {
    const playRes = await fetch(GEEKPLAY_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    console.log('[BGG] submitBggPlay fetch status:', playRes.status)
    const json = await playRes.json()
    console.log('[BGG] submitBggPlay fetch response:', json)
    if (json?.playid) {
      console.log('[BGG] submitBggPlay success (fetch), playId:', json.playid)
      return { success: true, playId: json.playid }
    }
    if (json?.error) {
      console.warn('[BGG] submitBggPlay BGG error (fetch):', json.error)
      return { success: false, error: json.error }
    }
    console.warn('[BGG] submitBggPlay unexpected response (fetch):', json)
    return { success: false, error: 'Unexpected response from BGG.' }
  } catch (fetchErr) {
    console.error('[BGG] submitBggPlay fetch error:', fetchErr)
    return { success: false, error: 'Network error. Check your connection and try again.' }
  }
}
