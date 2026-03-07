import { useState, useEffect } from 'react'
import {
  getBggCredentials,
  getBggMappings,
  saveBggMappings,
  isGamePublished,
  markGamePublished,
  submitBggPlay,
} from '../lib/bgg'
import styles from './BggPublishModal.module.css'

function placeIcon(i) {
  if (i === 0) return '🥇'
  if (i === 1) return '🥈'
  if (i === 2) return '🥉'
  return `${i + 1}.`
}

export default function BggPublishModal({ winner, players, gameId, rounds, onClose }) {
  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState(null)
  const [editedMappings, setEditedMappings] = useState({})
  const [alreadyPublished, setAlreadyPublished] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    async function load() {
      const [creds, maps, published] = await Promise.all([
        getBggCredentials(),
        getBggMappings(),
        isGamePublished(String(gameId)),
      ])
      setCredentials(creds)
      setEditedMappings(maps)
      setAlreadyPublished(published)
      setLoading(false)
    }
    load()
  }, [gameId])

  function updateMapping(localName, bggUsername) {
    setEditedMappings(prev => ({
      ...prev,
      [localName.toLowerCase()]: bggUsername.trim(),
    }))
  }

  async function handlePublish() {
    setStatus('submitting')
    setErrorMsg('')

    const playersPayload = sorted.map(p => ({
      name: p.name,
      bggUsername: editedMappings[p.name.toLowerCase()] || null,
      score: p.totalScore,
      isWinner: p.id === winner.id,
    }))

    const result = await submitBggPlay({
      players: playersPayload,
      playdate: today,
    })

    if (result.success) {
      await Promise.all([
        markGamePublished(String(gameId)),
        saveBggMappings(editedMappings),
      ])
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  // Render states
  if (loading) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <p className={styles.infoMsg}>Loading…</p>
        </div>
      </div>
    )
  }

  if (alreadyPublished) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Publish to BGG</span>
            <span className={styles.bggBadge}>BGG</span>
          </div>
          <p className={styles.infoMsg}>This game was already published to BoardGameGeek.</p>
          <div className={styles.actions}>
            <button className={styles.closeBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (!credentials) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Publish to BGG</span>
            <span className={styles.bggBadge}>BGG</span>
          </div>
          <p className={styles.infoMsg}>
            No BGG account configured.{'\n'}Tap ⚙ on the Setup screen to add your credentials.
          </p>
          <div className={styles.actions}>
            <button className={styles.closeBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Publish to BGG</span>
            <span className={styles.bggBadge}>BGG</span>
          </div>
          <p className={styles.successMsg}>Play recorded on BoardGameGeek! 🎉</p>
          <div className={styles.actions}>
            <button className={styles.closeBtn} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Publish to BGG</span>
          <span className={styles.bggBadge}>BGG</span>
        </div>

        <p className={styles.playMeta}>
          {today} · {rounds.length} round{rounds.length !== 1 ? 's' : ''}
        </p>

        <div className={styles.divider} />

        <div className={styles.sectionTitle}>Final Scores</div>
        {sorted.map((p, i) => (
          <div key={p.id} className={styles.playerRow}>
            <span className={styles.playerPlace}>{placeIcon(i)}</span>
            <span className={styles.playerName}>{p.name}</span>
            <span className={styles.playerScore}>{p.totalScore}</span>
          </div>
        ))}

        <div className={styles.divider} />

        <div className={styles.sectionTitle}>BGG Usernames</div>
        <p className={styles.mappingHint}>Edit to link players to their BGG accounts (optional)</p>
        {sorted.map(p => (
          <div key={p.id} className={styles.mappingRow}>
            <span className={styles.mappingLabel}>{p.name}</span>
            <input
              className={styles.mappingInput}
              placeholder="BGG username"
              value={editedMappings[p.name.toLowerCase()] ?? ''}
              onChange={e => updateMapping(p.name, e.target.value)}
              disabled={status === 'submitting'}
            />
          </div>
        ))}

        {status === 'error' && (
          <p className={styles.errorMsg}>{errorMsg}</p>
        )}

        <div className={styles.actions}>
          <button
            className={styles.skipBtn}
            onClick={onClose}
            disabled={status === 'submitting'}
          >
            Skip
          </button>
          <button
            className={styles.publishBtn}
            onClick={handlePublish}
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
