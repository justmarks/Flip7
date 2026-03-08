import { useState, useEffect } from 'react'
import Setup from './components/Setup'
import RoundEntry from './components/RoundEntry'
import Winner from './components/Winner'
import Leaderboard from './components/Leaderboard'
import ConfirmModal from './components/ConfirmModal'
import { recordGame, clearGameHistory } from './lib/storage'
import { trackEvent, trackScreen } from './lib/telemetry'

export default function App() {
  const [phase, setPhase] = useState('setup') // setup | roundEntry | winner | leaderboard

  useEffect(() => {
    trackScreen('setup')
  }, [])
  const [players, setPlayers] = useState([])
  const [rounds, setRounds] = useState([])
  const [currentRound, setCurrentRound] = useState(1)
  const [winner, setWinner] = useState(null)
  const [lastGameId, setLastGameId] = useState(null)

  const hasClearParam = new URLSearchParams(window.location.search).has('ClearHistory')
  const [showClearConfirm, setShowClearConfirm] = useState(hasClearParam)

  function handleClearConfirm() {
    clearGameHistory()
    setShowClearConfirm(false)
    const url = new URL(window.location)
    url.searchParams.delete('ClearHistory')
    window.history.replaceState({}, '', url)
  }

  function handleClearCancel() {
    setShowClearConfirm(false)
    const url = new URL(window.location)
    url.searchParams.delete('ClearHistory')
    window.history.replaceState({}, '', url)
  }

  function startGame(playerNames) {
    const newPlayers = playerNames.map((name, i) => ({
      id: i,
      name,
      totalScore: 0,
    }))
    setPlayers(newPlayers)
    setRounds([])
    setCurrentRound(1)
    setWinner(null)
    setPhase('roundEntry')
    trackEvent('game_started', { playerCount: playerNames.length })
    trackScreen('roundEntry')
  }

  async function submitRound(roundScores) {
    const updatedPlayers = players.map(p => {
      const entry = roundScores.find(r => r.playerId === p.id)
      return { ...p, totalScore: p.totalScore + (entry ? entry.score : 0) }
    })

    const newRounds = [...rounds, { roundNumber: currentRound, scores: roundScores }]
    setRounds(newRounds)
    setPlayers(updatedPlayers)

    const topScore = Math.max(...updatedPlayers.map(p => p.totalScore))
    if (topScore >= 200) {
      const roundWinner = updatedPlayers.reduce((a, b) => a.totalScore > b.totalScore ? a : b)
      const gameId = await recordGame({
        players: updatedPlayers.map(p => ({ name: p.name, score: p.totalScore })),
        winnerName: roundWinner.name,
        roundCount: newRounds.length,
      })
      setLastGameId(gameId)
      setWinner(roundWinner)
      setPhase('winner')
      trackEvent('game_completed', {
        playerCount: updatedPlayers.length,
        roundCount: newRounds.length,
        winningScore: roundWinner.totalScore,
      })
    } else {
      setCurrentRound(prev => prev + 1)
    }
  }

  function playAgain() {
    setPlayers(players.map(p => ({ ...p, totalScore: 0 })))
    setRounds([])
    setCurrentRound(1)
    setWinner(null)
    setPhase('roundEntry')
    trackEvent('game_started', { playerCount: players.length })
    trackScreen('roundEntry')
  }

  function resetGame() {
    setPhase('setup')
    setPlayers([])
    setRounds([])
    setCurrentRound(1)
    setWinner(null)
    trackScreen('setup')
  }

  let screen
  if (phase === 'setup') screen = (
    <Setup onStart={startGame} onLeaderboard={() => { setPhase('leaderboard'); trackScreen('leaderboard') }} />
  )
  else if (phase === 'roundEntry') screen = (
    <RoundEntry
      players={players}
      rounds={rounds}
      currentRound={currentRound}
      onSubmit={submitRound}
      onReset={resetGame}
    />
  )
  else if (phase === 'winner') screen = (
    <Winner winner={winner} players={players} rounds={rounds} gameId={lastGameId} onReset={resetGame} onPlayAgain={playAgain} />
  )
  else if (phase === 'leaderboard') screen = (
    <Leaderboard onBack={() => { setPhase('setup'); trackScreen('setup') }} />
  )

  return (
    <>
      {screen}
      {showClearConfirm && (
        <ConfirmModal
          title="Clear History?"
          message="This will permanently delete all recent game history. Player stats will not be affected."
          confirmLabel="Yes, clear it"
          cancelLabel="Cancel"
          onConfirm={handleClearConfirm}
          onCancel={handleClearCancel}
        />
      )}
    </>
  )
}
