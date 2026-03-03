import { useState } from 'react'
import styles from './RoundEntry.module.css'
import ConfirmModal from './ConfirmModal'

const MODIFIERS = ['+2', '+4', '+6', '+8', '+10', 'x2']
const PLAYER_COLORS = ['#FFD700', '#FF6B35', '#00C9A7', '#3A86FF', '#7B2FBE', '#EF233C', '#06D6A0', '#FB5607']

function calcScore({ busted, numberSum, modifiers, flip7 }) {
  if (busted) return 0
  let score = numberSum
  if (modifiers.includes('x2')) score *= 2
  for (const m of modifiers) {
    if (m !== 'x2') score += parseInt(m)
  }
  if (flip7) score += 15
  return score
}

function PlayerScoreInput({ player, entry, onChange }) {
  function toggleModifier(mod) {
    const current = entry.modifiers
    if (current.includes(mod)) {
      onChange({ modifiers: current.filter(m => m !== mod) })
    } else {
      onChange({ modifiers: [...current, mod] })
    }
  }

  function adjustNumberSum(delta) {
    onChange({ numberSum: Math.max(0, entry.numberSum + delta) })
  }

  const score = calcScore(entry)

  return (
    <div className={`${styles.playerCard} ${entry.busted ? styles.bustedCard : ''}`}>
      <div className={styles.playerHeader}>
        <span className={styles.playerName}>{player.name}</span>
        <div className={styles.scoreDisplay}>
          {entry.busted ? (
            <span className={styles.bustLabel}>BUST</span>
          ) : (
            <span className={styles.roundScore}>{score} pts</span>
          )}
        </div>
      </div>

      {!entry.busted && (
        <>
          <div className={styles.section}>
            <label className={styles.label}>Total from number cards</label>
            <div className={styles.numberRow}>
              <button className={styles.adjustBtn} onClick={() => adjustNumberSum(-1)}>−</button>
              <input
                className={styles.numberSum}
                type="number"
                min="0"
                value={entry.numberSum}
                onChange={e => onChange({ numberSum: Math.max(0, parseInt(e.target.value) || 0) })}
              />
              <button className={styles.adjustBtn} onClick={() => adjustNumberSum(1)}>+</button>
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Score Modifiers</label>
            <div className={styles.modifierGrid}>
              {MODIFIERS.map(mod => (
                <button
                  key={mod}
                  className={`${styles.modBtn} ${entry.modifiers.includes(mod) ? styles.modActive : ''}`}
                  onClick={() => toggleModifier(mod)}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <label className={styles.flip7Row}>
            <input
              type="checkbox"
              checked={entry.flip7}
              onChange={e => onChange({ flip7: e.target.checked })}
            />
            <span>Flip 7 bonus <strong>(+15)</strong></span>
          </label>
        </>
      )}

      <button
        className={`${styles.bustBtn} ${entry.busted ? styles.bustActive : ''}`}
        onClick={() => onChange({ busted: !entry.busted })}
      >
        {entry.busted ? 'Undo Bust' : 'Busted 💥'}
      </button>
    </div>
  )
}

export default function RoundEntry({ players, rounds, currentRound, onSubmit, onReset }) {
  const [entries, setEntries] = useState(
    players.map(p => ({
      playerId: p.id,
      busted: false,
      numberSum: 0,
      modifiers: [],
      flip7: false,
    }))
  )
  const [showConfirm, setShowConfirm] = useState(false)

  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)
  const gridCols = `140px repeat(${rounds.length}, 44px)`

  function updateEntry(playerId, changes) {
    setEntries(prev =>
      prev.map(e => e.playerId === playerId ? { ...e, ...changes } : e)
    )
  }

  function handleSubmit() {
    const scores = entries.map(e => ({
      playerId: e.playerId,
      score: calcScore(e),
    }))
    onSubmit(scores)
    setEntries(players.map(p => ({
      playerId: p.id,
      busted: false,
      numberSum: 0,
      modifiers: [],
      flip7: false,
    })))
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoFlip}>FLIP </span>7
        </div>
        <div className={styles.headerRight}>
          <span className={styles.roundBadge}>Round {currentRound}</span>
          <button className={styles.newGameBtn} onClick={() => rounds.length > 0 ? setShowConfirm(true) : onReset()}>
            New Game
          </button>
        </div>
      </div>

      {rounds.length > 0 && (
        <div className={styles.standings}>
          <div className={styles.standingsTitle}>Standings</div>
          {sorted.map((p, i) => {
            const pct = Math.min((p.totalScore / 200) * 100, 100)
            const color = PLAYER_COLORS[players.findIndex(pl => pl.id === p.id) % PLAYER_COLORS.length]
            return (
              <div key={p.id} className={styles.standingRow}>
                <span className={styles.standingRank}>{i === 0 ? '👑' : `${i + 1}`}</span>
                <span className={styles.standingName}>{p.name}</span>
                <div className={styles.standingBar}>
                  <div className={styles.standingFill} style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className={styles.standingScore}>{p.totalScore}</span>
              </div>
            )
          })}

          {rounds.length > 0 && (
            <div className={styles.historyTable} style={{ gridTemplateColumns: gridCols }}>
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
          )}
        </div>
      )}

      <div className={styles.sectionDivider}>
        <span>Round {currentRound} — Enter Scores</span>
      </div>

      <div className={styles.entries}>
        {players.map((p, i) => (
          <PlayerScoreInput
            key={p.id}
            player={p}
            entry={entries[i]}
            onChange={changes => updateEntry(p.id, changes)}
          />
        ))}
      </div>

      <button className={styles.submitBtn} onClick={handleSubmit}>
        Confirm Round {currentRound} Scores
      </button>

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
    </div>
  )
}
