import { useState } from 'react'
import styles from './RoundEntry.module.css'

const MODIFIERS = ['+2', '+4', '+6', '+8', '+10', 'x2']

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

export default function RoundEntry({ players, currentRound, onSubmit, onCancel }) {
  const [entries, setEntries] = useState(
    players.map(p => ({
      playerId: p.id,
      busted: false,
      numberSum: 0,
      modifiers: [],
      flip7: false,
    }))
  )

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
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onCancel}>← Back</button>
        <h2 className={styles.title}>Round {currentRound}</h2>
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
        Confirm Scores
      </button>
    </div>
  )
}
