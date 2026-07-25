// Pure "Predict the League" scoring engine. No I/O, no Supabase, no
// React -- just functions of data in, numbers out, so this stays fully
// unit-testable (see leagueScoring.test.js) and safe to run both on the
// client (live recompute) and later from a trusted server process.
//
// Rank convention throughout: order arrays are 0-indexed (order[0] =
// 1st place), but "rank" as used in league.zones (see data/leagues.js /
// getZoneForRank) is 1-indexed, matching the table position a user sees
// on screen.

import { SCORING } from '../data/scoringRules'

function rankOf(order, clubKey) {
  const idx = order.indexOf(clubKey)
  return idx === -1 ? null : idx + 1
}

function zoneClubs(order, zone) {
  if (!zone) return []
  return order.slice(zone.from - 1, zone.to)
}

// predictedOrder / actualOrder: arrays of club keys, 0-indexed by table
// position (predictedOrder[0] = predicted 1st place, etc). league: a
// LEAGUES entry from data/leagues.js (used for its `zones`).
//
// The relegation-style and UCL-style bonuses generalize to whatever size
// a league's 'relegation' / 'ucl' zones actually are (rather than
// hardcoding 3/4), so this works unmodified for every league in
// data/leagues.js even though the spec's numbers were written against
// the standard "3 down, top 4 UCL" shape used by Premier League / La
// Liga / Serie A / Bundesliga.
export function scoreTablePrediction(predictedOrder, actualOrder, league) {
  const perTeam = {}
  let tableTotal = 0

  for (const clubKey of actualOrder) {
    const actualRank = rankOf(actualOrder, clubKey)
    const predictedRank = rankOf(predictedOrder, clubKey)
    let pts = 0
    if (predictedRank != null && actualRank != null) {
      const placesOff = Math.abs(predictedRank - actualRank)
      pts = Math.max(0, SCORING.tableMaxPerTeam - SCORING.tablePlacesOffMultiplier * placesOff)
    }
    perTeam[clubKey] = pts
    tableTotal += pts
  }

  const winnerCorrect = !!predictedOrder[0] && predictedOrder[0] === actualOrder[0]
  const winnerPts = winnerCorrect ? SCORING.winnerBonus : 0

  const relegationZone = league?.zones?.find((z) => z.key === 'relegation') || null
  const actualRelegated = new Set(zoneClubs(actualOrder, relegationZone))
  const predictedRelegated = zoneClubs(predictedOrder, relegationZone)
  const relegationMatches = predictedRelegated.filter((c) => actualRelegated.has(c)).length
  const relegationFull = relegationZone && relegationMatches === (relegationZone.to - relegationZone.from + 1) && relegationMatches > 0
  const relegationPts = relegationFull
    ? SCORING.relegationTrioBonus
    : relegationMatches * SCORING.relegationTrioPartial

  const uclZone = league?.zones?.find((z) => z.key === 'ucl') || null
  const actualUcl = new Set(zoneClubs(actualOrder, uclZone))
  const predictedUcl = zoneClubs(predictedOrder, uclZone)
  const uclMatches = predictedUcl.filter((c) => actualUcl.has(c)).length
  const uclFull = uclZone && uclMatches === (uclZone.to - uclZone.from + 1) && uclMatches > 0
  const uclPts = uclFull ? SCORING.uclBonus : uclMatches * SCORING.uclPartial

  const bonusTotal = winnerPts + relegationPts + uclPts

  return {
    perTeam,
    tableTotal,
    winnerCorrect,
    winnerPts,
    relegationMatches,
    relegationFull,
    relegationPts,
    uclMatches,
    uclFull,
    uclPts,
    bonusTotal,
    total: tableTotal + bonusTotal,
  }
}

// prediction: { outcome: 'H'|'D'|'A', homeScore?, awayScore? }
// result: { homeScore, awayScore } (final/actual)
// Returns { pts, outcomeCorrect, exactCorrect }.
export function scoreMatchdayPrediction(prediction, result, isJoker = false) {
  if (!prediction || !result || result.homeScore == null || result.awayScore == null) {
    return { pts: 0, outcomeCorrect: false, exactCorrect: false }
  }
  const actualOutcome = result.homeScore > result.awayScore ? 'H' : result.homeScore < result.awayScore ? 'A' : 'D'
  const outcomeCorrect = prediction.outcome === actualOutcome
  const exactCorrect =
    outcomeCorrect &&
    prediction.homeScore != null &&
    prediction.awayScore != null &&
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore

  let pts = 0
  if (outcomeCorrect) pts += SCORING.matchdayOutcomePts
  if (exactCorrect) pts += SCORING.matchdayExactBonus
  if (isJoker) pts *= SCORING.jokerMultiplier

  return { pts, outcomeCorrect, exactCorrect }
}

// tableScore: result of scoreTablePrediction (or null if not yet scoreable).
// matchdayScores: array of { pts, exactCorrect } from scoreMatchdayPrediction.
export function computeOverallScore({ tableScore, matchdayScores = [] }) {
  const tablePts = tableScore?.total || 0
  const matchdayPts = matchdayScores.reduce((sum, m) => sum + (m?.pts || 0), 0)
  return {
    tablePts,
    matchdayPts,
    overallPts: tablePts + matchdayPts,
    exactScorelineCount: matchdayScores.filter((m) => m?.exactCorrect).length,
  }
}

// Tiebreak comparator for the Overall leaderboard, applied only when
// overallPts is equal. Order: exact scorelines hit (desc) -> relegation
// trio correct (desc) -> league winner correct (desc). Returns a
// negative/positive/zero number suitable for Array.prototype.sort.
// Each entry: { exactScorelineCount, relegationFull, winnerCorrect }.
export function compareForTiebreak(a, b) {
  if (b.exactScorelineCount !== a.exactScorelineCount) {
    return b.exactScorelineCount - a.exactScorelineCount
  }
  const aRelegation = a.relegationFull ? 1 : 0
  const bRelegation = b.relegationFull ? 1 : 0
  if (bRelegation !== aRelegation) return bRelegation - aRelegation

  const aWinner = a.winnerCorrect ? 1 : 0
  const bWinner = b.winnerCorrect ? 1 : 0
  return bWinner - aWinner
}

// Sorts an array of entries { overallPts, exactScorelineCount,
// relegationFull, winnerCorrect, ... } descending by overallPts, applying
// compareForTiebreak when tied. Returns a new sorted array.
export function sortOverallLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    if (b.overallPts !== a.overallPts) return b.overallPts - a.overallPts
    return compareForTiebreak(a, b)
  })
}
