import { Preferences } from '@capacitor/preferences'
import { CapacitorHttp, CapacitorCookies } from '@capacitor/core'

const CREDENTIALS_KEY = 'flip7_bgg_credentials'
const MAPPINGS_KEY = 'flip7_bgg_mappings'
const PUBLISHED_KEY = 'flip7_bgg_published'
const MAX_PUBLISHED = 200

const LOGIN_URL = '/bgg/login/api/v1'
const GEEKPLAY_URL = '/bgg/geekplay.php'
const FLIP7_BGG_ID = '420087'

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
    await CapacitorCookies.clearCookies({ url: 'https://boardgamegeek.com' })
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

  // Try CapacitorHttp first — session cookies from last login are sent automatically
  try {
    const playRes = await CapacitorHttp.post({
      url: GEEKPLAY_URL,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: body,
    })
    const json = typeof playRes.data === 'string' ? JSON.parse(playRes.data) : playRes.data
    if (json?.playid) return { success: true, playId: json.playid }
    if (json?.error) return { success: false, error: json.error }
    return { success: false, error: 'Unexpected response from BGG.' }
  } catch (_capErr) {
    // Fall through to fetch fallback
  }

  // fetch fallback — session cookies from last login are sent via credentials: 'include'
  try {
    const playRes = await fetch(GEEKPLAY_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = await playRes.json()
    if (json?.playid) return { success: true, playId: json.playid }
    if (json?.error) return { success: false, error: json.error }
    return { success: false, error: 'Unexpected response from BGG.' }
  } catch (_fetchErr) {
    return { success: false, error: 'Network error. Check your connection and try again.' }
  }
}
