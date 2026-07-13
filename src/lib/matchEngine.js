import { generateSquad, seededRng } from './nameGenerator'

// Knuth's algorithm for a Poisson-distributed random integer.
function poissonRandom(lambda, rng) {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Rating-gap threshold (roughly "1.5+ tiers" on this app's 0-99 scale, where
// a tier is ~8-10 points) above which a team is a clear underdog for the
// purposes of late-knockout upset dampening below. Lowered from 12 -> 9 so
// upper-mid-tier sides (e.g. Iran/Canada/Scotland/Cote d'Ivoire, rated
// 73-75) are correctly treated as big underdogs against elite/near-elite
// opponents (rated 84+), not just against the very top of the scale.
const BIG_UNDERDOG_GAP = 9

// Expected goals for `team` given the rating gap vs the opponent.
// Chaos is intentionally modest: a small random wobble plus a low flat
// chance of an upset-flavored swing, so ratings/form drive results while
// still allowing occasional surprises. From the round of 16 onward, a clear
// underdog (see BIG_UNDERDOG_GAP) has that upset-flavored spike dampened --
// both less likely to trigger and smaller when it does -- and from the
// semifinals onward the dampening is tightened further still, so a mid-tier
// side that got hot early can still reach a quarterfinal on occasion but
// making a semifinal or final is extremely rare, matching real-world
// late-tournament form (favorites are tested less by pure randomness the
// deeper a tournament goes).
function expectedGoals(ratingFor, ratingAgainst, rng, { knockoutStage = null } = {}) {
  const gap = ratingFor - ratingAgainst
  // Slightly steeper than before (0.038 -> 0.045) so large rating gaps pull
  // the underdog's baseline scoring rate down more, reducing upset odds that
  // come from plain Poisson variance -- not just the explicit spike below.
  let xg = 1.25 + gap * 0.045
  xg += (rng() - 0.5) * 0.35 // normal match-to-match variance

  const isBigUnderdog = gap <= -BIG_UNDERDOG_GAP
  let upsetChance = 0.03
  let upsetMagnitude = 0.5
  if (isBigUnderdog && knockoutStage === 'r16plus') {
    upsetChance = 0.01
    upsetMagnitude = 0.25
  } else if (isBigUnderdog && knockoutStage === 'semisplus') {
    upsetChance = 0.004
    upsetMagnitude = 0.15
  }
  if (rng() < upsetChance) xg += rng() * upsetMagnitude // rare, upset-flavored spike
  return clamp(xg, 0.15, 4.2)
}

function simulateGoalMinutes(count, rng) {
  const minutes = []
  for (let i = 0; i < count; i++) minutes.push(Math.ceil(rng() * 90))
  return minutes.sort((a, b) => a - b)
}

function buildScorers(count, squad, rng) {
  const scorers = []
  for (let i = 0; i < count; i++) {
    scorers.push(squad[Math.floor(rng() * squad.length)])
  }
  return scorers
}

function simulateStats(teamA, teamB, scoreA, scoreB, rng) {
  const ratingGap = teamA.rating - teamB.rating
  let possA = clamp(50 + ratingGap * 0.6 + (rng() - 0.5) * 10, 24, 76)
  const shotsA = clamp(Math.round(8 + scoreA * 1.6 + ratingGap * 0.05 + rng() * 4), 2, 24)
  const shotsB = clamp(Math.round(8 + scoreB * 1.6 - ratingGap * 0.05 + rng() * 4), 2, 24)
  const sotA = clamp(Math.round(shotsA * (0.35 + rng() * 0.2)), scoreA, shotsA)
  const sotB = clamp(Math.round(shotsB * (0.35 + rng() * 0.2)), scoreB, shotsB)
  const cardsA = Math.round(rng() * 3)
  const cardsB = Math.round(rng() * 3)
  return {
    possessionA: Math.round(possA),
    possessionB: Math.round(100 - possA),
    shotsA, shotsB,
    shotsOnTargetA: sotA, shotsOnTargetB: sotB,
    cardsA, cardsB,
  }
}

function simulatePenaltyShootout(teamA, teamB, rng) {
  const takeRound = (rating) => rng() < clamp(0.62 + (rating - 60) * 0.004, 0.45, 0.9)
  let a = 0, b = 0
  const roundsA = [], roundsB = []
  for (let round = 0; round < 5; round++) {
    const scoredA = takeRound(teamA.rating)
    roundsA.push(scoredA)
    if (scoredA) a++
    const scoredB = takeRound(teamB.rating)
    roundsB.push(scoredB)
    if (scoredB) b++
  }
  // Sudden death
  while (a === b) {
    const scoredA = takeRound(teamA.rating)
    const scoredB = takeRound(teamB.rating)
    roundsA.push(scoredA); roundsB.push(scoredB)
    if (scoredA) a++
    if (scoredB) b++
    if (roundsA.length > 20) break // safety valve
  }
  return { penA: a, penB: b }
}

// teamA/teamB shape: { name, rating, confederation, colors, iso2 }
// `roundSize`: number of teams entering the current knockout round (16 =
// round of 16, 8 = quarterfinals, 4 = semifinals, 2 = final). Optional --
// omitted for group matches and non-bracket play, where the upset dampening
// below doesn't apply.
export function simulateMatch(teamA, teamB, { knockout = false, seedKey = '', roundSize = null } = {}) {
  const rng = seededRng(`${teamA.name}-${teamB.name}-${seedKey}-${Math.random()}`)
  let knockoutStage = null
  if (knockout && roundSize != null) {
    if (roundSize <= 4) knockoutStage = 'semisplus' // semifinal, 3rd place, final
    else if (roundSize <= 16) knockoutStage = 'r16plus' // round of 16, quarterfinal
  }
  const xgA = expectedGoals(teamA.rating, teamB.rating, rng, { knockoutStage })
  const xgB = expectedGoals(teamB.rating, teamA.rating, rng, { knockoutStage })
  const scoreA = poissonRandom(xgA, rng)
  const scoreB = poissonRandom(xgB, rng)

  const squadA = generateSquad(teamA.name, teamA.confederation)
  const squadB = generateSquad(teamB.name, teamB.confederation)

  const minutesA = simulateGoalMinutes(scoreA, rng)
  const minutesB = simulateGoalMinutes(scoreB, rng)
  const scorersA = buildScorers(scoreA, squadA, rng).map((name, i) => ({ name, minute: minutesA[i] }))
  const scorersB = buildScorers(scoreB, squadB, rng).map((name, i) => ({ name, minute: minutesB[i] }))

  const stats = simulateStats(teamA, teamB, scoreA, scoreB, rng)

  let penA = null, penB = null, wentToPenalties = false
  if (knockout && scoreA === scoreB) {
    wentToPenalties = true
    const pens = simulatePenaltyShootout(teamA, teamB, rng)
    penA = pens.penA
    penB = pens.penB
  }

  const winner = wentToPenalties
    ? (penA > penB ? teamA.name : teamB.name)
    : (scoreA === scoreB ? null : (scoreA > scoreB ? teamA.name : teamB.name))

  return {
    teamA: teamA.name,
    teamB: teamB.name,
    scoreA, scoreB,
    scorersA, scorersB,
    stats,
    wentToPenalties, penA, penB,
    winner,
    played: true,
  }
}
