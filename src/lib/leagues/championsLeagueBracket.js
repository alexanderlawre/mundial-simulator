// Champions League knockout bracket: seeds the play-off round and the
// Round-of-16-onward bracket from a predicted 36-club league-phase table
// (`order`, an array of club keys, index 0 = 1st place). Reuses the generic
// reactive-bracket engine in tournamentEngine.js as-is; this file only adds
// the piece that's actually Champions-League-specific -- seeding.
import { buildBracketSkeleton, buildAdvancesToMap, buildWinnerOnlyResult, applyKnockoutResult, initialMatchState } from '../tournamentEngine'

// ---------- Play-off round (ranks 9-24, 16 clubs -> 8 matches) ----------

// Seeded 9th-place v 24th-place, 10th v 23rd, ... 16th v 17th -- the
// strongest club in the play-off band faces the weakest, working inward.
export function buildPlayoffPairs(order) {
  const band = order.slice(8, 24) // ranks 9-24 (0-indexed 8-23), 16 clubs
  return Array.from({ length: 8 }, (_, i) => [band[i], band[15 - i]])
}

export function initialPlayoffState(pairs) {
  const state = {}
  pairs.forEach(([teamA, teamB], i) => {
    state[`p${i}`] = { teamA, teamB, result: null }
  })
  return state
}

export function setPlayoffWinner(state, pairId, winnerKey) {
  const match = state[pairId]
  return {
    ...state,
    [pairId]: { ...match, result: buildWinnerOnlyResult(match.teamA, match.teamB, winnerKey) },
  }
}

export function playoffComplete(state) {
  return Object.values(state).every((m) => m.result?.winner)
}

// Winners in pair order (p0..p7), or null if any pair is still undecided.
export function getPlayoffWinners(state) {
  const winners = []
  for (let i = 0; i < 8; i++) {
    const w = state[`p${i}`]?.result?.winner
    if (!w) return null
    winners.push(w)
  }
  return winners
}

// ---------- Knockout bracket: Round of 16 -> QF -> SF -> Final ----------

export function buildKnockoutSkeleton() {
  return buildBracketSkeleton(16, false)
}

// The 8 auto-qualifiers (table ranks 1-8) each face one play-off winner.
// Seeded so the strongest auto-qualifier (rank 1) draws the winner of the
// weakest play-off pairing (16th v 17th), and the weakest auto-qualifier
// (rank 8) draws the winner of the strongest pairing (9th v 24th) -- a
// standard top-seeds-get-the-easiest-surviving-opponent shape.
export function buildR16Pairs(order, playoffWinners) {
  const top8 = order.slice(0, 8) // ranks 1-8
  return top8.map((club, i) => [club, playoffWinners[7 - i]])
}

export function buildInitialKnockoutState(r16Pairs) {
  const skeleton = buildKnockoutSkeleton()
  return initialMatchState(skeleton, r16Pairs)
}

export { buildAdvancesToMap, applyKnockoutResult, buildWinnerOnlyResult }
