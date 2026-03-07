import { useState, useEffect } from 'react'
import styles from './Setup.module.css'
import PlayerPicker from './PlayerPicker'
import BggSettingsModal from './BggSettingsModal'
import { getKnownPlayers, getLastPlayers, saveLastPlayers } from '../lib/storage'
import { getBggCredentials, getBggMappings } from '../lib/bgg'

export default function Setup({ onStart, onLeaderboard }) {
  const [names, setNames] = useState(['', '', ''])
  const [isReturning, setIsReturning] = useState(false)
  const [knownPlayers, setKnownPlayers] = useState([])
  const [showBggSettings, setShowBggSettings] = useState(false)
  const [bggCreds, setBggCreds] = useState(null)

  useEffect(() => {
    getLastPlayers().then(lp => {
      if (lp) { setNames(lp); setIsReturning(true) }
    })
    getKnownPlayers().then(setKnownPlayers)
    getBggCredentials().then(setBggCreds)
  }, [])

  // Pre-fill first player slot from BGG credentials when starting fresh
  useEffect(() => {
    if (!bggCreds?.username || isReturning) return
    getBggMappings().then(mappings => {
      // Reverse lookup: find local player whose BGG username matches the logged-in user
      const entry = Object.entries(mappings).find(
        ([, bgg]) => bgg.toLowerCase() === bggCreds.username.toLowerCase()
      )
      // Cross-reference with knownPlayers to get original-case display name
      const localName = entry
        ? (knownPlayers.find(p => p.name.toLowerCase() === entry[0])?.name ?? entry[0])
        : bggCreds.username
      setNames(prev => {
        const next = [...prev]
        if (!next[0]?.trim()) next[0] = localName
        return next
      })
    })
  }, [bggCreds, isReturning, knownPlayers])

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
      saveLastPlayers(filled)
      onStart(filled)
    }
  }

  function handleSettingsClose() {
    setShowBggSettings(false)
    // Refresh credentials in case they were updated
    getBggCredentials().then(setBggCreds)
  }

  const filledCount = names.filter(n => n.trim()).length
  const canStart = filledCount >= 2

  // Names currently selected (non-empty), for dimming in picker
  const selectedNames = names.filter(n => n.trim())

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <button className={styles.settingsBtn} onClick={() => setShowBggSettings(true)} type="button">⚙</button>
          <div className={styles.logoWrap}>
            <div className={styles.logo}>
              <span className={styles.logoFlip}>FLIP </span>7
            </div>
            <div className={styles.tagline}>The Greatest Card Game of All Time</div>
          </div>
          <button className={styles.leaderboardBtn} onClick={onLeaderboard} type="button">
            Leaderboard
          </button>
        </div>

        <div className={styles.divider} />

        <p className={styles.subtitle}>
          {isReturning ? 'Welcome back! Same players?' : 'Score Tracker — Enter Players'}
        </p>

        <div className={styles.players}>
          {names.map((name, i) => (
            <div key={i} className={styles.playerRow}>
              <PlayerPicker
                value={name}
                onChange={val => updateName(i, val)}
                knownPlayers={knownPlayers}
                selectedNames={selectedNames}
                placeholder={`Player ${i + 1}`}
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
        <p className={styles.version}>v{__APP_VERSION__}</p>
      </div>

      {showBggSettings && (
        <BggSettingsModal
          knownPlayers={knownPlayers}
          onClose={handleSettingsClose}
        />
      )}
    </div>
  )
}
