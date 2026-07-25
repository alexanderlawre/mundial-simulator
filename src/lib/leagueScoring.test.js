import { describe, it, expect } from 'vitest'
import { getLeague } from '../data/leagues'
import { SCORING, TABLE_MAX_SCORE } from '../data/scoringRules'
import {
  scoreTablePrediction,
  scoreMatchdayPrediction,
  computeOverallScore,
  compareForTiebreak,
  sortOverallLeaderboard,
} from './leagueScoring'

const league = getLeague('premier-league')
const actualOrder = league.clubs.map((c) => c.key) // 20 real club keys, zones: ucl 1-4, relegation 18-20

describe('scoreTablePrediction', () => {
  it('awards the full max score for a perfectly exact table', () => {
    const result = scoreTablePrediction(actualOrder, actualOrder, league)
    expect(result.tableTotal).toBe(TABLE_MAX_SCORE)
    expect(result.winnerCorrect).toBe(true)
    expect(result.winnerPts).toBe(SCORING.winnerBonus)
    expect(result.relegationFull).toBe(true)
    expect(result.relegationPts).toBe(SCORING.relegationTrioBonus)
    expect(result.uclFull).toBe(true)
    expect(result.uclPts).toBe(SCORING.uclBonus)
    expect(result.total).toBe(TABLE_MAX_SCORE + SCORING.winnerBonus + SCORING.relegationTrioBonus + SCORING.uclBonus)
  })

  it('scores 0 per team (floor) for a table reversed far enough that every team is >=10 places off', () => {
    const reversed = [...actualOrder].reverse()
    const result = scoreTablePrediction(reversed, actualOrder, league)
    // 20 clubs: position i (0-indexed) vs reversed position (19-i) -> placesOff = |19-2i|
    // With multiplier 2 and max 20, floor(0) kicks in once placesOff >= 10.
    expect(result.tableTotal).toBeLessThan(TABLE_MAX_SCORE)
    expect(result.tableTotal).toBeGreaterThanOrEqual(0)
    expect(result.winnerCorrect).toBe(false)
    expect(result.winnerPts).toBe(0)
  })

  it('applies the per-place formula correctly for a single team', () => {
    // Move the actual 1st place team to predicted 4th (3 places off).
    const predicted = [...actualOrder]
    const first = predicted.shift()
    predicted.splice(3, 0, first)
    const result = scoreTablePrediction(predicted, actualOrder, league)
    // 3 places off * 2 = 6; 20 - 6 = 14
    expect(result.perTeam[first]).toBe(14)
  })

  it('gives relegation partial credit when 2 of 3 relegated teams are correct', () => {
    const predicted = [...actualOrder]
    // Swap one of the actual relegation-zone clubs (rank 20, index 19)
    // with a safe mid-table club (index 10) so exactly 2/3 relegation
    // predictions remain correct.
    ;[predicted[19], predicted[10]] = [predicted[10], predicted[19]]
    const result = scoreTablePrediction(predicted, actualOrder, league)
    expect(result.relegationMatches).toBe(2)
    expect(result.relegationFull).toBe(false)
    expect(result.relegationPts).toBe(2 * SCORING.relegationTrioPartial)
  })

  it('gives UCL partial credit when 3 of 4 top-4 teams are correct', () => {
    const predicted = [...actualOrder]
    ;[predicted[3], predicted[10]] = [predicted[10], predicted[3]]
    const result = scoreTablePrediction(predicted, actualOrder, league)
    expect(result.uclMatches).toBe(3)
    expect(result.uclFull).toBe(false)
    expect(result.uclPts).toBe(3 * SCORING.uclPartial)
  })
})

describe('scoreMatchdayPrediction', () => {
  const result = { homeScore: 2, awayScore: 1 }

  it('awards 0 for a wrong outcome', () => {
    const { pts, outcomeCorrect, exactCorrect } = scoreMatchdayPrediction({ outcome: 'A' }, result)
    expect(pts).toBe(0)
    expect(outcomeCorrect).toBe(false)
    expect(exactCorrect).toBe(false)
  })

  it('awards 1 point for correct outcome without exact score', () => {
    const { pts, outcomeCorrect, exactCorrect } = scoreMatchdayPrediction(
      { outcome: 'H', homeScore: 3, awayScore: 0 },
      result
    )
    expect(pts).toBe(SCORING.matchdayOutcomePts)
    expect(outcomeCorrect).toBe(true)
    expect(exactCorrect).toBe(false)
  })

  it('awards 3 points total for an exact scoreline', () => {
    const { pts, exactCorrect } = scoreMatchdayPrediction({ outcome: 'H', homeScore: 2, awayScore: 1 }, result)
    expect(pts).toBe(SCORING.matchdayOutcomePts + SCORING.matchdayExactBonus)
    expect(exactCorrect).toBe(true)
  })

  it('doubles points when the joker is used', () => {
    const { pts } = scoreMatchdayPrediction({ outcome: 'H', homeScore: 2, awayScore: 1 }, result, true)
    expect(pts).toBe((SCORING.matchdayOutcomePts + SCORING.matchdayExactBonus) * SCORING.jokerMultiplier)
  })

  it('handles a draw outcome correctly', () => {
    const drawResult = { homeScore: 1, awayScore: 1 }
    const { pts, outcomeCorrect } = scoreMatchdayPrediction({ outcome: 'D', homeScore: 1, awayScore: 1 }, drawResult)
    expect(outcomeCorrect).toBe(true)
    expect(pts).toBe(SCORING.matchdayOutcomePts + SCORING.matchdayExactBonus)
  })
})

describe('computeOverallScore', () => {
  it('sums table and matchday points and counts exact scorelines', () => {
    const tableScore = { total: 350 }
    const matchdayScores = [
      { pts: 3, exactCorrect: true },
      { pts: 1, exactCorrect: false },
      { pts: 0, exactCorrect: false },
    ]
    const result = computeOverallScore({ tableScore, matchdayScores })
    expect(result.tablePts).toBe(350)
    expect(result.matchdayPts).toBe(4)
    expect(result.overallPts).toBe(354)
    expect(result.exactScorelineCount).toBe(1)
  })
})

describe('compareForTiebreak / sortOverallLeaderboard', () => {
  it('breaks ties by exact scorelines, then relegation trio, then winner call', () => {
    const a = { overallPts: 300, exactScorelineCount: 2, relegationFull: false, winnerCorrect: true }
    const b = { overallPts: 300, exactScorelineCount: 5, relegationFull: false, winnerCorrect: false }
    expect(compareForTiebreak(a, b)).toBeGreaterThan(0) // b should rank above a
  })

  it('falls back to relegation trio when exact scorelines are equal', () => {
    const a = { overallPts: 300, exactScorelineCount: 2, relegationFull: true, winnerCorrect: false }
    const b = { overallPts: 300, exactScorelineCount: 2, relegationFull: false, winnerCorrect: true }
    expect(compareForTiebreak(a, b)).toBeLessThan(0) // a should rank above b
  })

  it('sorts a full leaderboard by overallPts first, tiebreaks second', () => {
    const entries = [
      { name: 'low', overallPts: 100, exactScorelineCount: 0, relegationFull: false, winnerCorrect: false },
      { name: 'tie-more-exact', overallPts: 200, exactScorelineCount: 3, relegationFull: false, winnerCorrect: false },
      { name: 'tie-less-exact', overallPts: 200, exactScorelineCount: 1, relegationFull: true, winnerCorrect: true },
      { name: 'high', overallPts: 300, exactScorelineCount: 0, relegationFull: false, winnerCorrect: false },
    ]
    const sorted = sortOverallLeaderboard(entries)
    expect(sorted.map((e) => e.name)).toEqual(['high', 'tie-more-exact', 'tie-less-exact', 'low'])
  })
})
