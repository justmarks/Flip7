import { Preferences } from '@capacitor/preferences'

const STATS_KEY = 'flip7_player_stats'
const HISTORY_KEY = 'flip7_game_history'
const LAST_PLAYERS_KEY = 'flip7_last_players'
const MAX_HISTORY = 100

async function readStats() {
  try {
    const { value } = await Preferences.get({ key: STATS_KEY })
    if (value) return JSON.parse(value)
  } catch {}
  return {}
}

async function writeStats(stats) {
  try {
    await Preferences.set({ key: STATS_KEY, value: JSON.stringify(stats) })
  } catch {}
}

async function readHistory() {
  try {
    const { value } = await Preferences.get({ key: HISTORY_KEY })
    if (value) return JSON.parse(value)
  } catch {}
  return []
}

async function writeHistory(history) {
  try {
    await Preferences.set({ key: HISTORY_KEY, value: JSON.stringify(history) })
  } catch {}
}

/** Returns player stat objects sorted by lastPlayed desc */
export async function getKnownPlayers() {
  const stats = await readStats()
  return Object.values(stats).sort((a, b) => {
    if (b.lastPlayed > a.lastPlayed) return 1
    if (b.lastPlayed < a.lastPlayed) return -1
    return 0
  })
}

/** Raw stats object keyed by lowercased name */
export async function getPlayerStats() {
  return readStats()
}

/** Raw history array, newest first */
export async function getGameHistory() {
  return readHistory()
}

/** Last players array, or null */
export async function getLastPlayers() {
  try {
    const { value } = await Preferences.get({ key: LAST_PLAYERS_KEY })
    if (value) {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed
    }
  } catch {}
  return null
}

/** Persists the last players list */
export async function saveLastPlayers(names) {
  try {
    await Preferences.set({ key: LAST_PLAYERS_KEY, value: JSON.stringify(names) })
  } catch {}
}

/** Clears the game history array (stats are kept) */
export async function clearGameHistory() {
  try {
    await Preferences.remove({ key: HISTORY_KEY })
  } catch {}
}

/**
 * Records a completed game.
 * @param {{ players: Array<{name: string, score: number}>, winnerName: string, roundCount: number }} param
 */
export async function recordGame({ players, winnerName, roundCount }) {
  const stats = await readStats()
  const now = new Date().toISOString()

  for (const { name, score } of players) {
    const key = name.toLowerCase()
    const existing = stats[key] ?? {
      name,
      gamesPlayed: 0,
      wins: 0,
      highScore: 0,
      lastPlayed: now,
    }
    existing.gamesPlayed += 1
    if (name === winnerName) existing.wins += 1
    if (score > existing.highScore) existing.highScore = score
    existing.lastPlayed = now
    stats[key] = existing
  }
  await writeStats(stats)

  const history = await readHistory()
  const entry = {
    id: Date.now(),
    date: now,
    winner: winnerName,
    roundCount,
    players: players.map(p => ({ name: p.name, score: p.score })),
  }
  history.unshift(entry)
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
  await writeHistory(history)
}
