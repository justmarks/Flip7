const STATS_KEY = 'flip7_player_stats'
const HISTORY_KEY = 'flip7_game_history'
const MAX_HISTORY = 100

function readStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function writeStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {}
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function writeHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {}
}

/** Returns player stat objects sorted by lastPlayed desc */
export function getKnownPlayers() {
  const stats = readStats()
  return Object.values(stats).sort((a, b) => {
    if (b.lastPlayed > a.lastPlayed) return 1
    if (b.lastPlayed < a.lastPlayed) return -1
    return 0
  })
}

/** Raw stats object keyed by lowercased name */
export function getPlayerStats() {
  return readStats()
}

/** Raw history array, newest first */
export function getGameHistory() {
  return readHistory()
}

/** Clears the game history array (stats are kept) */
export function clearGameHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {}
}

/**
 * Records a completed game.
 * @param {{ players: Array<{name: string, score: number}>, winnerName: string, roundCount: number }} param
 */
export function recordGame({ players, winnerName, roundCount }) {
  const stats = readStats()
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
  writeStats(stats)

  const history = readHistory()
  const entry = {
    id: Date.now(),
    date: now,
    winner: winnerName,
    roundCount,
    players: players.map(p => ({ name: p.name, score: p.score })),
  }
  history.unshift(entry)
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
  writeHistory(history)
}
