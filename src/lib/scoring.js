export function calcScore({ busted, numberSum, modifiers, flip7 }) {
  if (busted) return 0
  let score = numberSum
  if (modifiers.includes('x2')) score *= 2
  for (const m of modifiers) {
    if (m !== 'x2') score += parseInt(m)
  }
  if (flip7) score += 15
  return score
}
