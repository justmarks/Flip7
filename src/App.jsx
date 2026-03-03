import { useState } from 'react'
import Setup from './components/Setup'
import RoundEntry from './components/RoundEntry'
import Winner from './components/Winner'

export default function App() {
  const [phase, setPhase] = useState('setup') // setup | roundEntry | winner
  const [players, setPlayers] = useState([])
  const [rounds, setRounds] = useState([])
  const [currentRound, setCurrentRound] = useState(1)
  const [winner, setWinner] = useState(null)

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
  }

  function submitRound(roundScores) {
    const updatedPlayers = players.map(p => {
      const entry = roundScores.find(r => r.playerId === p.id)
      return { ...p, totalScore: p.totalScore + (entry ? entry.score : 0) }
    })

    setRounds(prev => [...prev, { roundNumber: currentRound, scores: roundScores }])
    setPlayers(updatedPlayers)

    const topScore = Math.max(...updatedPlayers.map(p => p.totalScore))
    if (topScore >= 200) {
      const roundWinner = updatedPlayers.reduce((a, b) => a.totalScore > b.totalScore ? a : b)
      setWinner(roundWinner)
      setPhase('winner')
    } else {
      setCurrentRound(prev => prev + 1)
    }
  }

  function resetGame() {
    setPhase('setup')
    setPlayers([])
    setRounds([])
    setCurrentRound(1)
    setWinner(null)
  }

  if (phase === 'setup') return <Setup onStart={startGame} />
  if (phase === 'roundEntry') return (
    <RoundEntry
      players={players}
      rounds={rounds}
      currentRound={currentRound}
      onSubmit={submitRound}
      onReset={resetGame}
    />
  )
  if (phase === 'winner') return (
    <Winner winner={winner} players={players} rounds={rounds} onReset={resetGame} />
  )
}
