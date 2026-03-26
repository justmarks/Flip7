import { describe, it, expect } from 'vitest'
import { calcScore } from '../scoring.js'

describe('calcScore', () => {
  it('returns 0 when busted regardless of other values', () => {
    expect(calcScore({ busted: true, numberSum: 50, modifiers: ['+10'], flip7: true })).toBe(0)
  })

  it('returns numberSum with no modifiers', () => {
    expect(calcScore({ busted: false, numberSum: 25, modifiers: [], flip7: false })).toBe(25)
  })

  it('returns 0 for a zeroed-out entry', () => {
    expect(calcScore({ busted: false, numberSum: 0, modifiers: [], flip7: false })).toBe(0)
  })

  it('applies additive modifiers', () => {
    expect(calcScore({ busted: false, numberSum: 10, modifiers: ['+2', '+4'], flip7: false })).toBe(16)
  })

  it('applies x2 before additive modifiers', () => {
    // 10 * 2 = 20, then +4 = 24
    expect(calcScore({ busted: false, numberSum: 10, modifiers: ['x2', '+4'], flip7: false })).toBe(24)
  })

  it('order of modifiers array does not change x2 application', () => {
    // x2 is always applied first regardless of array order
    expect(calcScore({ busted: false, numberSum: 10, modifiers: ['+4', 'x2'], flip7: false })).toBe(24)
  })

  it('adds 15 for flip7 bonus', () => {
    expect(calcScore({ busted: false, numberSum: 10, modifiers: [], flip7: true })).toBe(25)
  })

  it('combines all modifiers correctly', () => {
    // 10 * 2 = 20, +6 = 26, +15 flip7 = 41
    expect(calcScore({ busted: false, numberSum: 10, modifiers: ['x2', '+6'], flip7: true })).toBe(41)
  })

  it('handles all standard modifiers together', () => {
    // 10 * 2 = 20, +2+4+6+8+10 = 50, +15 = 65
    expect(calcScore({ busted: false, numberSum: 10, modifiers: ['x2', '+2', '+4', '+6', '+8', '+10'], flip7: true })).toBe(65)
  })
})
