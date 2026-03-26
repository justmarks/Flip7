import { describe, it, expect, vi, beforeEach } from 'vitest'

const prefsStore = {}

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }) => ({ value: prefsStore[key] ?? null })),
    set: vi.fn(async ({ key, value }) => { prefsStore[key] = value }),
    remove: vi.fn(async ({ key }) => { delete prefsStore[key] }),
  },
}))

import { Preferences } from '@capacitor/preferences'
import {
  getKnownPlayers,
  getPlayerStats,
  getGameHistory,
  getLastPlayers,
  saveLastPlayers,
  clearGameHistory,
  recordGame,
} from '../storage.js'

beforeEach(() => {
  for (const k of Object.keys(prefsStore)) delete prefsStore[k]
  vi.clearAllMocks()
  Preferences.get.mockImplementation(async ({ key }) => ({ value: prefsStore[key] ?? null }))
  Preferences.set.mockImplementation(async ({ key, value }) => { prefsStore[key] = value })
  Preferences.remove.mockImplementation(async ({ key }) => { delete prefsStore[key] })
})

const sampleGame = {
  players: [
    { name: 'Alice', score: 120 },
    { name: 'Bob', score: 95 },
  ],
  winnerName: 'Alice',
  roundCount: 5,
}

// ===========================================================================
// getGameHistory
// ===========================================================================
describe('getGameHistory', () => {
  it('returns empty array when nothing stored', async () => {
    expect(await getGameHistory()).toEqual([])
  })

  it('returns stored history', async () => {
    prefsStore['flip7_game_history'] = JSON.stringify([{ id: 1, winner: 'Alice' }])
    expect(await getGameHistory()).toEqual([{ id: 1, winner: 'Alice' }])
  })

  it('returns empty array on corrupted JSON', async () => {
    prefsStore['flip7_game_history'] = 'not-json'
    expect(await getGameHistory()).toEqual([])
  })
})

// ===========================================================================
// clearGameHistory
// ===========================================================================
describe('clearGameHistory', () => {
  it('removes the history key', async () => {
    prefsStore['flip7_game_history'] = JSON.stringify([{ id: 1 }])
    await clearGameHistory()
    expect(prefsStore['flip7_game_history']).toBeUndefined()
  })

  it('does not throw when nothing is stored', async () => {
    await expect(clearGameHistory()).resolves.toBeUndefined()
  })
})

// ===========================================================================
// getLastPlayers
// ===========================================================================
describe('getLastPlayers', () => {
  it('returns null when nothing stored', async () => {
    expect(await getLastPlayers()).toBeNull()
  })

  it('returns null for a single player (requires 2+)', async () => {
    prefsStore['flip7_last_players'] = JSON.stringify(['Alice'])
    expect(await getLastPlayers()).toBeNull()
  })

  it('returns array when 2+ players stored', async () => {
    prefsStore['flip7_last_players'] = JSON.stringify(['Alice', 'Bob'])
    expect(await getLastPlayers()).toEqual(['Alice', 'Bob'])
  })

  it('returns null on corrupted JSON', async () => {
    prefsStore['flip7_last_players'] = 'bad-json'
    expect(await getLastPlayers()).toBeNull()
  })
})

// ===========================================================================
// saveLastPlayers
// ===========================================================================
describe('saveLastPlayers', () => {
  it('persists player names', async () => {
    await saveLastPlayers(['Alice', 'Bob', 'Charlie'])
    expect(JSON.parse(prefsStore['flip7_last_players'])).toEqual(['Alice', 'Bob', 'Charlie'])
  })
})

// ===========================================================================
// recordGame
// ===========================================================================
describe('recordGame', () => {
  it('creates a history entry and returns a numeric id', async () => {
    const id = await recordGame(sampleGame)
    expect(typeof id).toBe('number')
    const history = JSON.parse(prefsStore['flip7_game_history'])
    expect(history).toHaveLength(1)
    expect(history[0].winner).toBe('Alice')
    expect(history[0].roundCount).toBe(5)
    expect(history[0].id).toBe(id)
  })

  it('stores players in the history entry', async () => {
    await recordGame(sampleGame)
    const history = JSON.parse(prefsStore['flip7_game_history'])
    expect(history[0].players).toEqual([
      { name: 'Alice', score: 120 },
      { name: 'Bob', score: 95 },
    ])
  })

  it('initialises player stats on first game', async () => {
    await recordGame(sampleGame)
    const stats = JSON.parse(prefsStore['flip7_player_stats'])
    expect(stats['alice'].gamesPlayed).toBe(1)
    expect(stats['alice'].wins).toBe(1)
    expect(stats['alice'].highScore).toBe(120)
    expect(stats['bob'].gamesPlayed).toBe(1)
    expect(stats['bob'].wins).toBe(0)
  })

  it('accumulates stats across multiple games', async () => {
    await recordGame(sampleGame)
    await recordGame({
      players: [{ name: 'Alice', score: 100 }, { name: 'Bob', score: 150 }],
      winnerName: 'Bob',
      roundCount: 4,
    })
    const stats = JSON.parse(prefsStore['flip7_player_stats'])
    expect(stats['alice'].gamesPlayed).toBe(2)
    expect(stats['alice'].wins).toBe(1)
    expect(stats['bob'].gamesPlayed).toBe(2)
    expect(stats['bob'].wins).toBe(1)
  })

  it('tracks high score correctly across games', async () => {
    await recordGame(sampleGame)
    await recordGame({
      players: [{ name: 'Alice', score: 180 }, { name: 'Bob', score: 90 }],
      winnerName: 'Alice',
      roundCount: 3,
    })
    const stats = JSON.parse(prefsStore['flip7_player_stats'])
    expect(stats['alice'].highScore).toBe(180)
    expect(stats['bob'].highScore).toBe(95)
  })

  it('prepends new game to history (newest first)', async () => {
    await recordGame(sampleGame)
    await recordGame({ ...sampleGame, winnerName: 'Bob' })
    const history = JSON.parse(prefsStore['flip7_game_history'])
    expect(history[0].winner).toBe('Bob')
    expect(history[1].winner).toBe('Alice')
  })

  it('caps history at 100 entries', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({ id: i, winner: `Player${i}` }))
    prefsStore['flip7_game_history'] = JSON.stringify(existing)
    await recordGame(sampleGame)
    const history = JSON.parse(prefsStore['flip7_game_history'])
    expect(history).toHaveLength(100)
    expect(history[0].winner).toBe('Alice')
  })
})

// ===========================================================================
// getKnownPlayers
// ===========================================================================
describe('getKnownPlayers', () => {
  it('returns empty array when no stats stored', async () => {
    expect(await getKnownPlayers()).toEqual([])
  })

  it('returns players sorted by lastPlayed descending', async () => {
    prefsStore['flip7_player_stats'] = JSON.stringify({
      alice: { name: 'Alice', lastPlayed: '2024-01-01T00:00:00Z' },
      bob: { name: 'Bob', lastPlayed: '2024-06-01T00:00:00Z' },
    })
    const players = await getKnownPlayers()
    expect(players[0].name).toBe('Bob')
    expect(players[1].name).toBe('Alice')
  })
})

// ===========================================================================
// getPlayerStats
// ===========================================================================
describe('getPlayerStats', () => {
  it('returns empty object when nothing stored', async () => {
    expect(await getPlayerStats()).toEqual({})
  })

  it('returns the raw stats object keyed by lowercase name', async () => {
    prefsStore['flip7_player_stats'] = JSON.stringify({ alice: { name: 'Alice', wins: 3 } })
    expect(await getPlayerStats()).toEqual({ alice: { name: 'Alice', wins: 3 } })
  })
})
