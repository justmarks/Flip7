import styles from './Winner.module.css'

export default function Winner({ winner, players, rounds, onReset }) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.trophy}>🏆</div>
        <h1 className={styles.title}>Game Over!</h1>
        <p className={styles.winnerName}>{winner.name} wins!</p>
        <p className={styles.winnerScore}>{winner.totalScore}</p>
        <p className={styles.winnerLabel}>points</p>
        <p className={styles.rounds}>after {rounds.length} round{rounds.length !== 1 ? 's' : ''}</p>

        <div className={styles.divider} />

        <div className={styles.finalScores}>
          <div className={styles.finalTitle}>Final Standings</div>
          {sorted.map((p, i) => (
            <div key={p.id} className={`${styles.row} ${i === 0 ? styles.first : ''}`}>
              <span className={styles.place}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span className={styles.pName}>{p.name}</span>
              <span className={styles.pScore}>{p.totalScore}</span>
            </div>
          ))}
        </div>

        <button className={styles.newGameBtn} onClick={onReset}>Play Again</button>
      </div>
    </div>
  )
}
