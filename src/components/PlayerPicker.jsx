import { useState, useRef } from 'react'
import styles from './PlayerPicker.module.css'

export default function PlayerPicker({ value, onChange, knownPlayers, selectedNames, placeholder }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const lowerValue = value.toLowerCase()
  const filtered = knownPlayers.filter(p =>
    p.name.toLowerCase().includes(lowerValue)
  )

  function handleFocus() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function handleBlur() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      e.currentTarget.blur()
    }
  }

  function selectPlayer(name) {
    onChange(name)
    setOpen(false)
  }

  const showDropdown = open && filtered.length > 0

  return (
    <div className={styles.wrap}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={20}
        autoComplete="off"
      />
      {showDropdown && (
        <div className={styles.dropdown}>
          {filtered.map(p => {
            const isSelected = selectedNames.some(
              n => n.toLowerCase() === p.name.toLowerCase()
            )
            return (
              <button
                key={p.name}
                className={`${styles.item} ${isSelected ? styles.dimmed : ''}`}
                onMouseDown={() => !isSelected && selectPlayer(p.name)}
                disabled={isSelected}
                type="button"
              >
                <span className={styles.itemName}>{p.name}</span>
                <span className={styles.itemBadge}>
                  {p.gamesPlayed}g · {p.wins}w
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
