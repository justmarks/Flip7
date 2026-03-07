import { useState, useEffect } from 'react'
import {
  getBggCredentials,
  saveBggCredentials,
  clearBggCredentials,
  getBggMappings,
  saveBggMappings,
  verifyBggCredentials,
} from '../lib/bgg'
import styles from './BggSettingsModal.module.css'

export default function BggSettingsModal({ knownPlayers, onClose }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mappings, setMappings] = useState({})
  const [saveStatus, setSaveStatus] = useState(null) // null | 'verifying' | 'saving' | 'saved' | 'error'
  const [authError, setAuthError] = useState(null)
  const [hasStoredAccount, setHasStoredAccount] = useState(false)

  useEffect(() => {
    async function load() {
      const [creds, maps] = await Promise.all([getBggCredentials(), getBggMappings()])
      if (creds) {
        setUsername(creds.username)
        setHasStoredAccount(true)
        // password is never stored — user must re-enter to refresh the session
      }
      setMappings(maps)
    }
    load()
  }, [])

  function updateMapping(localName, bggUsername) {
    setMappings(prev => ({
      ...prev,
      [localName.toLowerCase()]: bggUsername.trim(),
    }))
  }

  async function handleLogout() {
    await clearBggCredentials()
    setHasStoredAccount(false)
    // username stays pre-filled so the user can just re-enter their password
  }

  async function handleSave() {
    setAuthError(null)
    const trimmedUser = username.trim()
    if (trimmedUser && password) {
      setSaveStatus('verifying')
      const { ok, error } = await verifyBggCredentials({ username: trimmedUser, password })
      if (!ok) {
        setAuthError(error ?? 'Invalid credentials.')
        setSaveStatus('error')
        return
      }
    }
    setSaveStatus('saving')
    await Promise.all([
      saveBggCredentials({ username: username.trim() }),
      saveBggMappings(mappings),
    ])
    setSaveStatus('saved')
    setTimeout(() => onClose(), 800)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>BGG Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.divider} />

        <div className={styles.sectionTitle}>BoardGameGeek Account</div>

        <label className={styles.fieldLabel}>Username</label>
        <input
          className={styles.input}
          type="text"
          placeholder="BGG username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />

        <label className={styles.fieldLabel}>Password</label>
        <div className={styles.passwordRow}>
          <input
            className={styles.input}
            type={showPassword ? 'text' : 'password'}
            placeholder="BGG password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            className={styles.togglePassword}
            type="button"
            onClick={() => setShowPassword(v => !v)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {hasStoredAccount && (
          <button className={styles.logoutBtn} type="button" onClick={handleLogout}>
            Log out of BGG
          </button>
        )}

        <div className={styles.divider} />

        <div className={styles.sectionTitle}>Player → BGG Username</div>
        <p className={styles.sectionHint}>Link local names to BGG accounts for play logging.</p>

        {knownPlayers.length === 0 ? (
          <p className={styles.emptyMsg}>Play a game first to map players.</p>
        ) : (
          knownPlayers.map(p => (
            <div key={p.name} className={styles.mappingRow}>
              <span className={styles.mappingLabel}>{p.name}</span>
              <input
                className={styles.mappingInput}
                type="text"
                placeholder="BGG username"
                value={mappings[p.name.toLowerCase()] ?? ''}
                onChange={e => updateMapping(p.name, e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          ))
        )}

        <div className={styles.divider} />

        {saveStatus === 'saved' && (
          <p className={styles.savedMsg}>Saved!</p>
        )}
        {authError && (
          <p className={styles.errorMsg}>{authError}</p>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saveStatus === 'verifying' || saveStatus === 'saving'}
          >
            {saveStatus === 'verifying' ? 'Verifying…' : saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
