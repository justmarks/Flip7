import { useState, useEffect } from 'react'
import { getPlayerStats, getGameHistory } from '../lib/storage'
import styles from './Leaderboard.module.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function winPct(wins, played) {
  if (!played) return '0%'
  return Math.round((wins / played) * 100) + '%'
}

export default function Leaderboard({ onBack }) {
  const [stats, setStats] = useState({})
  const [history, setHistory] = useState([])

  useEffect(() => {
    getPlayerStats().then(setStats)
    getGameHistory().then(setHistory)
  }, [])

  const rows = Object.values(stats).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.highScore !== a.highScore) return b.highScore - a.highScore
    return b.gamesPlayed - a.gamesPlayed
  })

  const recentGames = history.slice(0, 20)

  const rankIcon = i => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return i + 1
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>← Back</button>
          <h2 className={styles.title}>Leaderboard</h2>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>All-Time Stats</h3>
          {rows.length === 0 ? (
            <p className={styles.empty}>No games recorded yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thRank}>Rank</th>
                    <th className={styles.thName}>Name</th>
                    <th>Games</th>
                    <th>Wins</th>
                    <th>Best</th>
                    <th>Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={p.name} className={i < 3 ? styles.topRow : ''}>
                      <td className={styles.tdRank}>{rankIcon(i)}</td>
                      <td className={styles.tdName}>{p.name}</td>
                      <td>{p.gamesPlayed}</td>
                      <td>{p.wins}</td>
                      <td>{p.highScore}</td>
                      <td>{winPct(p.wins, p.gamesPlayed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className={styles.divider} />

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent Games</h3>
          {recentGames.length === 0 ? (
            <p className={styles.empty}>No games recorded yet.</p>
          ) : (
            <div className={styles.gameList}>
              {recentGames.map(game => {
                const winnerPlayer = game.players.find(p => p.name === game.winner)
                const winnerScore = winnerPlayer ? winnerPlayer.score : '?'
                return (
                  <div key={game.id} className={styles.gameCard}>
                    <div className={styles.gameTop}>
                      <span className={styles.gameDate}>{formatDate(game.date)}</span>
                      <span className={styles.gameRounds}>{game.roundCount} round{game.roundCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.gameBottom}>
                      <span className={styles.gameWinner}>🏆 {game.winner}</span>
                      <span className={styles.gameScore}>{winnerScore} pts</span>
                    </div>
                    <div className={styles.gamePlayers}>
                      {game.players.map(p => (
                        <span key={p.name} className={`${styles.playerChip} ${p.name === game.winner ? styles.winnerChip : ''}`}>
                          {p.name} {p.score}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
