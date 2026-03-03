import { useState } from 'react'
import styles from './Scoreboard.module.css'
import ConfirmModal from './ConfirmModal'

const PLAYER_COLORS = ['#FFD700', '#FF6B35', '#00C9A7', '#3A86FF', '#7B2FBE', '#EF233C', '#06D6A0', '#FB5607']

export default function Scoreboard({ players, rounds, currentRound, onStartRound, onReset }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)
  const gridCols = `140px repeat(${rounds.length}, 44px)`

  function handleNewGame() {
    if (rounds.length > 0) {
      setShowConfirm(true)
    } else {
      onReset()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoFlip}>FLIP </span>7
        </div>
        <span className={styles.roundBadge}>Round {currentRound}</span>
      </div>

      <div className={styles.scoreboard}>
        {sorted.map((p, i) => {
          const pct = Math.min((p.totalScore / 200) * 100, 100)
          const isLeader = i === 0 && p.totalScore > 0
          const color = PLAYER_COLORS[players.findIndex(pl => pl.id === p.id) % PLAYER_COLORS.length]
          return (
            <div key={p.id} className={`${styles.playerRow} ${isLeader ? styles.leader : ''}`}>
              <div className={styles.rank}>{i === 0 && p.totalScore > 0 ? '👑' : `${i + 1}`}</div>
              <div className={styles.playerInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.name}>{p.name}</span>
                  <span className={styles.score}>{p.totalScore}</span>
                </div>
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${pct}%`, background: isLeader ? `linear-gradient(90deg, ${color}, #FFA500)` : `linear-gradient(90deg, ${color}99, ${color})` }}
                    />
                  </div>
                  <span className={styles.needed}>
                    {p.totalScore >= 200 ? '🏆' : `${200 - p.totalScore} to win`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        <button className={styles.startRoundBtn} onClick={onStartRound}>
          ▶ Enter Round {currentRound} Scores
        </button>
        <button className={styles.resetBtn} onClick={handleNewGame}>New Game</button>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Start a new game?"
          message={`Round ${currentRound} is in progress. All current scores will be lost.`}
          confirmLabel="Yes, new game"
          cancelLabel="Keep playing"
          onConfirm={onReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {rounds.length > 0 && (
        <div className={styles.history}>
          <div className={styles.historyTitle}>Round History</div>
          <div className={styles.historyTable}>
            <div className={styles.historyHeader} style={{ gridTemplateColumns: gridCols }}>
              <span>Player</span>
              {rounds.map(r => <span key={r.roundNumber}>R{r.roundNumber}</span>)}
            </div>
            {players.map(p => (
              <div key={p.id} className={styles.historyRow} style={{ gridTemplateColumns: gridCols }}>
                <span className={styles.historyName}>{p.name}</span>
                {rounds.map(r => {
                  const entry = r.scores.find(s => s.playerId === p.id)
                  return (
                    <span key={r.roundNumber} className={entry?.score === 0 ? styles.bust : ''}>
                      {entry ? entry.score : '—'}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
