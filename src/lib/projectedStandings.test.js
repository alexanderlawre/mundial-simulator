import { describe, expect, it } from 'vitest'
import { projectStandingsPPG } from './projectedStandings'

describe('projectStandingsPPG', () => {
  it('returns an empty array when there is no standings data yet', () => {
    expect(projectStandingsPPG(null)).toEqual([])
    expect(projectStandingsPPG([])).toEqual([])
  })

  it('extrapolates points-per-game over remaining fixtures', () => {
    const standings = [
      { clubKey: 'a', played: 10, points: 25, goalDiff: 10 }, // 2.5 ppg
      { clubKey: 'b', played: 10, points: 15, goalDiff: 0 }, // 1.5 ppg
    ]
    const projected = projectStandingsPPG(standings, 38)
    // 28 remaining matches * 2.5 ppg = 70 + 25 = 95
    expect(projected[0].clubKey).toBe('a')
    expect(projected[0].projectedPoints).toBeCloseTo(95, 1)
    // 28 remaining * 1.5 = 42 + 15 = 57
    expect(projected[1].clubKey).toBe('b')
    expect(projected[1].projectedPoints).toBeCloseTo(57, 1)
  })

  it('sorts descending by projected points, breaking ties on goal difference', () => {
    const standings = [
      { clubKey: 'low-gd', played: 38, points: 60, goalDiff: -5 },
      { clubKey: 'high-gd', played: 38, points: 60, goalDiff: 20 },
    ]
    const projected = projectStandingsPPG(standings, 38)
    expect(projected[0].clubKey).toBe('high-gd')
  })

  it('handles a club with zero matches played without dividing by zero', () => {
    const standings = [{ clubKey: 'fresh', played: 0, points: 0, goalDiff: 0 }]
    const projected = projectStandingsPPG(standings, 38)
    expect(projected[0].projectedPoints).toBe(0)
    expect(projected[0].pointsPerGame).toBe(0)
  })
})
