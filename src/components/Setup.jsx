import { useState } from 'react'
import styles from './Setup.module.css'

const STORAGE_KEY = 'flip7_last_players'

function loadLastPlayers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed
    }
  } catch {}
  return null
}

export default function Setup({ onStart }) {
  const lastPlayers = loadLastPlayers()
  const [names, setNames] = useState(lastPlayers ?? ['', '', ''])
  const isReturning = !!lastPlayers

  function addPlayer() {
    if (names.length < 18) setNames(prev => [...prev, ''])
  }

  function removePlayer(i) {
    setNames(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateName(i, val) {
    setNames(prev => prev.map((n, idx) => idx === i ? val : n))
  }

  function handleStart() {
    const filled = names.map(n => n.trim()).filter(Boolean)
    if (filled.length >= 2) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filled))
      onStart(filled)
    }
  }

  const filledCount = names.filter(n => n.trim()).length
  const canStart = filledCount >= 2

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logo}>
            <span className={styles.logoFlip}>FLIP </span>7
          </div>
          <div className={styles.tagline}>The Greatest Card Game of All Time</div>
        </div>

        <div className={styles.divider} />

        <p className={styles.subtitle}>
          {isReturning ? 'Welcome back! Same players?' : 'Score Tracker — Enter Players'}
        </p>

        <div className={styles.players}>
          {names.map((name, i) => (
            <div key={i} className={styles.playerRow}>
              <input
                value={name}
                onChange={e => updateName(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
              />
              {names.length > 2 && (
                <button className={styles.removeBtn} onClick={() => removePlayer(i)}>✕</button>
              )}
            </div>
          ))}
        </div>

        {names.length < 18 && (
          <button className={styles.addBtn} onClick={addPlayer}>+ Add Player</button>
        )}

        <button
          className={styles.startBtn}
          onClick={handleStart}
          disabled={!canStart}
        >
          Start Game
        </button>

        <p className={styles.hint}>First to 200 points wins!</p>
      </div>
    </div>
  )
}
