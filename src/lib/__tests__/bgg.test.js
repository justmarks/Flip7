import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoist mock fn references so vi.mock factories can reference them
// ---------------------------------------------------------------------------
const { mockCapacitorHttpPost, mockClearCookies, prefsStore } = vi.hoisted(() => {
  const prefsStore = {}
  return {
    prefsStore,
    mockCapacitorHttpPost: vi.fn(),
    mockClearCookies: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Mock @capacitor/preferences
// ---------------------------------------------------------------------------
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }) => ({ value: prefsStore[key] ?? null })),
    set: vi.fn(async ({ key, value }) => { prefsStore[key] = value }),
    remove: vi.fn(async ({ key }) => { delete prefsStore[key] }),
  },
}))

// ---------------------------------------------------------------------------
// Mock @capacitor/core
// ---------------------------------------------------------------------------
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: { post: mockCapacitorHttpPost },
  CapacitorCookies: { clearCookies: mockClearCookies },
}))

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Import SUT after mocks are registered
// ---------------------------------------------------------------------------
import {
  getBggCredentials,
  saveBggCredentials,
  clearBggCredentials,
  getBggMappings,
  saveBggMappings,
  isGamePublished,
  markGamePublished,
  verifyBggCredentials,
  submitBggPlay,
} from '../bgg.js'

import { Preferences } from '@capacitor/preferences'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCapRes(data, status = 200) {
  return { status, data, headers: {} }
}
function makeFetchRes(json, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => json,
  }
}

// ---------------------------------------------------------------------------
// Reset shared state between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  for (const k of Object.keys(prefsStore)) delete prefsStore[k]
  vi.clearAllMocks()
  // Re-bind implementations after clearAllMocks
  Preferences.get.mockImplementation(async ({ key }) => ({ value: prefsStore[key] ?? null }))
  Preferences.set.mockImplementation(async ({ key, value }) => { prefsStore[key] = value })
  Preferences.remove.mockImplementation(async ({ key }) => { delete prefsStore[key] })
})

// ===========================================================================
// getBggCredentials
// ===========================================================================
describe('getBggCredentials', () => {
  it('returns null when nothing stored', async () => {
    expect(await getBggCredentials()).toBeNull()
  })

  it('returns parsed object when stored', async () => {
    prefsStore['flip7_bgg_credentials'] = JSON.stringify({ username: 'alice' })
    expect(await getBggCredentials()).toEqual({ username: 'alice' })
  })

  it('returns null on corrupted JSON', async () => {
    prefsStore['flip7_bgg_credentials'] = 'not-json{{{'
    expect(await getBggCredentials()).toBeNull()
  })
})

// ===========================================================================
// saveBggCredentials
// ===========================================================================
describe('saveBggCredentials', () => {
  it('stores only username — password is not persisted', async () => {
    await saveBggCredentials({ username: 'bob', password: 'secret' })
    const stored = JSON.parse(prefsStore['flip7_bgg_credentials'])
    expect(stored).toEqual({ username: 'bob' })
    expect(stored.password).toBeUndefined()
  })
})

// ===========================================================================
// clearBggCredentials
// ===========================================================================
describe('clearBggCredentials', () => {
  it('removes credentials key and clears BGG cookies', async () => {
    prefsStore['flip7_bgg_credentials'] = JSON.stringify({ username: 'alice' })
    await clearBggCredentials()
    expect(prefsStore['flip7_bgg_credentials']).toBeUndefined()
    expect(mockClearCookies).toHaveBeenCalledWith({ url: 'https://boardgamegeek.com' })
  })
})

// ===========================================================================
// getBggMappings
// ===========================================================================
describe('getBggMappings', () => {
  it('returns empty object when nothing stored', async () => {
    expect(await getBggMappings()).toEqual({})
  })

  it('returns parsed mappings', async () => {
    prefsStore['flip7_bgg_mappings'] = JSON.stringify({ alice: 'alice_bgg' })
    expect(await getBggMappings()).toEqual({ alice: 'alice_bgg' })
  })

  it('returns empty object on corrupted JSON', async () => {
    prefsStore['flip7_bgg_mappings'] = 'bad'
    expect(await getBggMappings()).toEqual({})
  })
})

// ===========================================================================
// saveBggMappings
// ===========================================================================
describe('saveBggMappings', () => {
  it('persists mappings', async () => {
    await saveBggMappings({ charlie: 'charlie_bgg' })
    expect(JSON.parse(prefsStore['flip7_bgg_mappings'])).toEqual({ charlie: 'charlie_bgg' })
  })
})

// ===========================================================================
// isGamePublished
// ===========================================================================
describe('isGamePublished', () => {
  it('returns false when nothing stored', async () => {
    expect(await isGamePublished('game-1')).toBe(false)
  })

  it('returns true when id is in the list', async () => {
    prefsStore['flip7_bgg_published'] = JSON.stringify(['game-1', 'game-2'])
    expect(await isGamePublished('game-1')).toBe(true)
  })

  it('returns false when id is not in the list', async () => {
    prefsStore['flip7_bgg_published'] = JSON.stringify(['game-2'])
    expect(await isGamePublished('game-1')).toBe(false)
  })

  it('coerces numeric id to string for comparison', async () => {
    prefsStore['flip7_bgg_published'] = JSON.stringify(['42'])
    expect(await isGamePublished(42)).toBe(true)
  })
})

// ===========================================================================
// markGamePublished
// ===========================================================================
describe('markGamePublished', () => {
  it('adds id when list was empty', async () => {
    await markGamePublished('game-1')
    expect(JSON.parse(prefsStore['flip7_bgg_published'])).toContain('game-1')
  })

  it('prepends to existing list', async () => {
    prefsStore['flip7_bgg_published'] = JSON.stringify(['game-old'])
    await markGamePublished('game-new')
    const list = JSON.parse(prefsStore['flip7_bgg_published'])
    expect(list[0]).toBe('game-new')
    expect(list).toContain('game-old')
  })

  it('caps list at 200 entries', async () => {
    const initial = Array.from({ length: 200 }, (_, i) => `g${i}`)
    prefsStore['flip7_bgg_published'] = JSON.stringify(initial)
    await markGamePublished('overflow')
    const list = JSON.parse(prefsStore['flip7_bgg_published'])
    expect(list.length).toBe(200)
    expect(list[0]).toBe('overflow')
    expect(list).not.toContain('g199') // last element was evicted
  })
})

// ===========================================================================
// verifyBggCredentials
// ===========================================================================
describe('verifyBggCredentials', () => {
  const creds = { username: 'alice', password: 'pw' }

  it('returns ok:true on CapacitorHttp 200', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes(null, 200))
    expect(await verifyBggCredentials(creds)).toEqual({ ok: true })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns ok:true on CapacitorHttp 204', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes(null, 204))
    expect(await verifyBggCredentials(creds)).toEqual({ ok: true })
  })

  it('returns ok:false on CapacitorHttp 401', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes(null, 401))
    const result = await verifyBggCredentials(creds)
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('falls back to fetch when CapacitorHttp throws', async () => {
    mockCapacitorHttpPost.mockRejectedValue(new Error('native unavailable'))
    mockFetch.mockResolvedValue(makeFetchRes(null, 200))
    expect(await verifyBggCredentials(creds)).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalled()
  })

  it('returns ok:false when fetch returns non-ok status', async () => {
    mockCapacitorHttpPost.mockRejectedValue(new Error('n/a'))
    mockFetch.mockResolvedValue(makeFetchRes(null, 401))
    const result = await verifyBggCredentials(creds)
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns network error when both CapacitorHttp and fetch throw', async () => {
    mockCapacitorHttpPost.mockRejectedValue(new Error('n/a'))
    mockFetch.mockRejectedValue(new Error('offline'))
    const result = await verifyBggCredentials(creds)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/network/i)
  })
})

// ===========================================================================
// submitBggPlay — CapacitorHttp path
// ===========================================================================
const samplePlayers = [
  { name: 'Alice', bggUsername: 'alice_bgg', score: 55, isWinner: true },
  { name: 'Bob', bggUsername: null, score: 30, isWinner: false },
]
const sampleDate = '2024-01-15'

describe('submitBggPlay — CapacitorHttp path', () => {
  it('returns success with playId on valid response object', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes({ playid: 12345 }))
    expect(await submitBggPlay({ players: samplePlayers, playdate: sampleDate }))
      .toEqual({ success: true, playId: 12345 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('parses JSON string response correctly', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes(JSON.stringify({ playid: 99 })))
    expect(await submitBggPlay({ players: samplePlayers, playdate: sampleDate }))
      .toEqual({ success: true, playId: 99 })
  })

  it('returns success:false with BGG error message', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes({ error: 'Not logged in' }))
    expect(await submitBggPlay({ players: samplePlayers, playdate: sampleDate }))
      .toEqual({ success: false, error: 'Not logged in' })
  })

  it('returns success:false with generic message on unexpected response', async () => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes({ something: 'weird' }))
    const result = await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

// ===========================================================================
// submitBggPlay — fetch fallback path
// ===========================================================================
describe('submitBggPlay — fetch fallback', () => {
  beforeEach(() => {
    mockCapacitorHttpPost.mockRejectedValue(new Error('native unavailable'))
  })

  it('returns success with playId via fetch', async () => {
    mockFetch.mockResolvedValue(makeFetchRes({ playid: 777 }))
    expect(await submitBggPlay({ players: samplePlayers, playdate: sampleDate }))
      .toEqual({ success: true, playId: 777 })
  })

  it('returns BGG error via fetch', async () => {
    mockFetch.mockResolvedValue(makeFetchRes({ error: 'Session expired' }))
    expect(await submitBggPlay({ players: samplePlayers, playdate: sampleDate }))
      .toEqual({ success: false, error: 'Session expired' })
  })

  it('returns generic error on unexpected fetch response', async () => {
    mockFetch.mockResolvedValue(makeFetchRes({ nope: true }))
    const result = await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('returns network error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('offline'))
    const result = await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/network/i)
  })
})

// ===========================================================================
// submitBggPlay — request body shape
// ===========================================================================
describe('submitBggPlay — request body', () => {
  beforeEach(() => {
    mockCapacitorHttpPost.mockResolvedValue(makeCapRes({ playid: 1 }))
  })

  it('sends correct static fields', async () => {
    await submitBggPlay({ players: samplePlayers, playdate: '2024-06-01' })
    const body = mockCapacitorHttpPost.mock.calls[0][0].data
    expect(body).toContain('action=save')
    expect(body).toContain('objectid=420087')
    expect(body).toContain('objecttype=thing')
    expect(body).toContain('playdate=2024-06-01')
    expect(body).toContain('quantity=1')
  })

  it('includes bggUsername for mapped players', async () => {
    await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    const body = mockCapacitorHttpPost.mock.calls[0][0].data
    expect(body).toContain('players%5B0%5D%5Busername%5D=alice_bgg')
  })

  it('omits username field for unmapped players', async () => {
    await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    const body = mockCapacitorHttpPost.mock.calls[0][0].data
    expect(body).not.toContain('players%5B1%5D%5Busername%5D')
  })

  it('encodes win flags correctly', async () => {
    await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    const body = mockCapacitorHttpPost.mock.calls[0][0].data
    expect(body).toContain('players%5B0%5D%5Bwin%5D=1')
    expect(body).toContain('players%5B1%5D%5Bwin%5D=0')
  })

  it('encodes scores correctly', async () => {
    await submitBggPlay({ players: samplePlayers, playdate: sampleDate })
    const body = mockCapacitorHttpPost.mock.calls[0][0].data
    expect(body).toContain('players%5B0%5D%5Bscore%5D=55')
    expect(body).toContain('players%5B1%5D%5Bscore%5D=30')
  })
})
