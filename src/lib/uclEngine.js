// UEFA Champions League simulation engine (36-club league phase + knockout
// play-offs / Round of 16 / QF / SF / single-leg final). Pure functions only;
// every random choice takes an `rng` (a () => [0,1) function) so tests can
// pin results and the UI can pass Math.random.
import { generateSquad } from './nameGenerator'

// ---------------------------------------------------------------- RNG ----

function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

// mulberry32 seeded from a string (better statistical quality than the
// lightweight LCG in nameGenerator.js, which the draw solver can't rely on).
export function createRng(seed) {
  if (seed == null) return Math.random
  let a = xmur3(String(seed))()
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function poisson(lambda, rng) {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

// ------------------------------------------------------- match model ----

// Calibrated against real Champions League league-phase / knockout data:
// ~2.9-3.0 goals per match, home teams winning ~45%, draws ~22%, away wins
// ~33%, with the favourite (rating gap) shifting both teams' scoring rates
// and the occasional upset still possible. See uclEngine.test.js for the
// Monte Carlo guard that pins these ranges.
const BASE_GOALS = 1.32
const HOME_BOOST = 0.24
const AWAY_PENALTY = 0.06
const GAP_SLOPE = 0.036

function expectedGoals(ratingFor, ratingAgainst, isHome, neutral, rng) {
  const gap = ratingFor - ratingAgainst
  let xg = BASE_GOALS + gap * GAP_SLOPE
  if (!neutral) xg += isHome ? HOME_BOOST : -AWAY_PENALTY
  xg += (rng() - 0.5) * 0.4 // match-to-match variance
  if (rng() < 0.03) xg += rng() * 0.5 // rare upset-flavoured spike
  return clamp(xg, 0.12, 4.4)
}

function scorersFor(club, count, rng, minuteMax = 90, minuteMin = 1) {
  const squad = generateSquad(club.name, 'UEFA')
  const minutes = []
  for (let i = 0; i < count; i++) minutes.push(minuteMin + Math.floor(rng() * (minuteMax - minuteMin + 1)))
  minutes.sort((a, b) => a - b)
  return minutes.map((minute) => ({ name: squad[Math.floor(rng() * squad.length)], minute }))
}

// One 90-minute match. `home`/`away` are club objects ({ name, rating }).
export function simulateClubMatch(home, away, { neutral = false, rng = Math.random } = {}) {
  const hg = poisson(expectedGoals(home.rating, away.rating, true, neutral, rng), rng)
  const ag = poisson(expectedGoals(away.rating, home.rating, false, neutral, rng), rng)
  return {
    homeGoals: hg,
    awayGoals: ag,
    homeScorers: scorersFor(home, hg, rng),
    awayScorers: scorersFor(away, ag, rng),
  }
}

function penaltyShootout(a, b, rng) {
  const p = (club) => clamp(0.74 + (club.rating - 70) * 0.002, 0.66, 0.82)
  let sa = 0
  let sb = 0
  for (let i = 0; i < 5; i++) {
    if (rng() < p(a)) sa++
    if (rng() < p(b)) sb++
  }
  let guard = 0
  while (sa === sb && guard++ < 30) {
    const x = rng() < p(a)
    const y = rng() < p(b)
    if (x) sa++
    if (y) sb++
  }
  if (sa === sb) sa++ // safety valve, effectively unreachable
  return { penA: sa, penB: sb }
}

// Extra time: 30 minutes, so roughly a third of normal scoring rates, and
// goals land between minutes 91 and 120.
function extraTime(home, away, rng) {
  const lh = expectedGoals(home.rating, away.rating, true, false, rng) / 3.4
  const la = expectedGoals(away.rating, home.rating, false, false, rng) / 3.4
  const hg = poisson(lh, rng)
  const ag = poisson(la, rng)
  return {
    homeGoals: hg,
    awayGoals: ag,
    homeScorers: scorersFor(home, hg, rng, 120, 91),
    awayScorers: scorersFor(away, ag, rng, 120, 91),
  }
}

// ------------------------------------------------------ knockout ties ----

// Two-legged tie. `firstLegHome` hosts leg 1, `secondLegHome` hosts leg 2.
// No away-goals rule (abolished in 2021): level on aggregate after leg 2 ->
// extra time -> penalties.
export function simulateTwoLeggedTie(firstLegHome, secondLegHome, { rng = Math.random } = {}) {
  const leg1 = simulateClubMatch(firstLegHome, secondLegHome, { rng })
  const leg2 = simulateClubMatch(secondLegHome, firstLegHome, { rng })
  // Aggregate from the point of view of firstLegHome (A) / secondLegHome (B).
  let aggA = leg1.homeGoals + leg2.awayGoals
  let aggB = leg1.awayGoals + leg2.homeGoals
  let et = null
  let pens = null
  let winner
  if (aggA === aggB) {
    et = extraTime(secondLegHome, firstLegHome, rng)
    aggA += et.awayGoals
    aggB += et.homeGoals
  }
  if (aggA === aggB) {
    const p = penaltyShootout(firstLegHome, secondLegHome, rng)
    pens = { penA: p.penA, penB: p.penB }
    winner = p.penA > p.penB ? firstLegHome.key : secondLegHome.key
  } else {
    winner = aggA > aggB ? firstLegHome.key : secondLegHome.key
  }
  return {
    kind: 'two-leg',
    teamA: firstLegHome.key, // hosts leg 1
    teamB: secondLegHome.key, // hosts leg 2
    leg1, // home = teamA
    leg2, // home = teamB
    et, // home = teamB (the leg-2 host)
    aggA,
    aggB,
    pens,
    winner,
  }
}

// Single-leg final on neutral ground (extra time + penalties if level).
export function simulateFinal(a, b, { rng = Math.random } = {}) {
  const match = simulateClubMatch(a, b, { neutral: true, rng })
  let goalsA = match.homeGoals
  let goalsB = match.awayGoals
  let et = null
  let pens = null
  let winner
  if (goalsA === goalsB) {
    et = extraTime(a, b, rng)
    goalsA += et.homeGoals
    goalsB += et.awayGoals
  }
  if (goalsA === goalsB) {
    const p = penaltyShootout(a, b, rng)
    pens = { penA: p.penA, penB: p.penB }
    winner = p.penA > p.penB ? a.key : b.key
  } else {
    winner = goalsA > goalsB ? a.key : b.key
  }
  return { kind: 'final', teamA: a.key, teamB: b.key, match, et, goalsA, goalsB, pens, winner }
}

// Plays one knockout tie. The better league-phase finisher hosts the second
// leg (UEFA's seeding advantage); the final is a neutral single match.
// `clubByKey`: key -> club, `rankByKey`: key -> league-phase position (1-36).
export function playTie(tie, clubByKey, rankByKey, { rng = Math.random } = {}) {
  const a = clubByKey[tie.a]
  const b = clubByKey[tie.b]
  if (tie.round === 'final') return simulateFinal(a, b, { rng })
  const aIsBetter = rankByKey[tie.a] < rankByKey[tie.b]
  return aIsBetter ? simulateTwoLeggedTie(b, a, { rng }) : simulateTwoLeggedTie(a, b, { rng })
}

// ------------------------------------------------ user-chosen results ----

const OUTCOME_OF = (hg, ag) => (hg > ag ? 'home' : hg < ag ? 'away' : 'draw')
const MAX_TRIES = 6000

// A plausible scoreline for a match whose outcome ('home' | 'draw' | 'away')
// the user picked: resample the real match model until it agrees, so a forced
// upset still looks like one (usually 1-0 or 2-1) rather than an arbitrary
// number. Falls back to a narrow win/draw if the odds are astronomically thin.
export function simulateClubMatchWithOutcome(home, away, outcome, { neutral = false, rng = Math.random } = {}) {
  for (let i = 0; i < MAX_TRIES; i++) {
    const r = simulateClubMatch(home, away, { neutral, rng })
    if (OUTCOME_OF(r.homeGoals, r.awayGoals) === outcome) return r
  }
  const hg = outcome === 'home' ? 1 : outcome === 'draw' ? 1 : 0
  const ag = outcome === 'away' ? 1 : outcome === 'draw' ? 1 : 0
  return {
    homeGoals: hg,
    awayGoals: ag,
    homeScorers: scorersFor(home, hg, rng),
    awayScorers: scorersFor(away, ag, rng),
  }
}

// A result for a score the user typed in.
export function buildManualMatch(home, away, homeGoals, awayGoals, { rng = Math.random } = {}) {
  return {
    homeGoals,
    awayGoals,
    homeScorers: scorersFor(home, homeGoals, rng),
    awayScorers: scorersFor(away, awayGoals, rng),
  }
}

function forcedTie(first, second, winnerKey, rng) {
  const firstWins = winnerKey === first.key
  const leg1 = buildManualMatch(first, second, firstWins ? 1 : 0, firstWins ? 0 : 1, { rng })
  const leg2 = buildManualMatch(second, first, firstWins ? 0 : 1, firstWins ? 1 : 0, { rng })
  return {
    kind: 'two-leg',
    teamA: first.key,
    teamB: second.key,
    leg1,
    leg2,
    et: null,
    aggA: leg1.homeGoals + leg2.awayGoals,
    aggB: leg1.awayGoals + leg2.homeGoals,
    pens: null,
    winner: winnerKey,
  }
}

// Knockout tie decided by the user: simulates the tie (same leg hosts and
// rules as playTie) until the chosen club comes through, so the legs,
// aggregate, extra time and penalties all stay consistent with that winner.
export function playTieWithWinner(tie, clubByKey, rankByKey, winnerKey, { rng = Math.random } = {}) {
  for (let i = 0; i < MAX_TRIES; i++) {
    const r = playTie(tie, clubByKey, rankByKey, { rng })
    if (r.winner === winnerKey) return r
  }
  const a = clubByKey[tie.a]
  const b = clubByKey[tie.b]
  if (tie.round === 'final') {
    const aWins = winnerKey === a.key
    const match = buildManualMatch(a, b, aWins ? 1 : 0, aWins ? 0 : 1, { rng })
    return { kind: 'final', teamA: a.key, teamB: b.key, match, et: null, goalsA: match.homeGoals, goalsB: match.awayGoals, pens: null, winner: winnerKey }
  }
  const aIsBetter = rankByKey[tie.a] < rankByKey[tie.b]
  return aIsBetter ? forcedTie(b, a, winnerKey, rng) : forcedTie(a, b, winnerKey, rng)
}

// ---------------------------------------------------------- pots / draw ----

export function sortByCoefficient(clubs) {
  return [...clubs].sort((x, y) => y.coef - x.coef || y.rating - x.rating || x.name.localeCompare(y.name))
}

// 36 clubs -> 4 pots of 9, ranked by UEFA club coefficient.
export function buildPots(clubs) {
  const sorted = sortByCoefficient(clubs)
  const size = sorted.length / 4
  return [0, 1, 2, 3].map((p) => sorted.slice(p * size, (p + 1) * size))
}

function tryDrawOnce(pots, rng, maxPerNation) {
  const teams = pots.flat()
  const potOf = new Map()
  pots.forEach((pot, p) => pot.forEach((c) => potOf.set(c.key, p)))
  const oppNation = new Map(teams.map((c) => [c.key, new Map()]))
  const played = new Map(teams.map((c) => [c.key, new Set()]))
  const fixtures = [] // { home, away }

  function canPlay(h, v) {
    if (h.key === v.key) return false
    if (played.get(h.key).has(v.key)) return false
    if (h.country === v.country) return false
    if (maxPerNation != null) {
      if ((oppNation.get(h.key).get(v.country) || 0) >= maxPerNation) return false
      if ((oppNation.get(v.key).get(h.country) || 0) >= maxPerNation) return false
    }
    return true
  }
  function add(h, v) {
    played.get(h.key).add(v.key)
    played.get(v.key).add(h.key)
    const a = oppNation.get(h.key)
    a.set(v.country, (a.get(v.country) || 0) + 1)
    const b = oppNation.get(v.key)
    b.set(h.country, (b.get(h.country) || 0) + 1)
    fixtures.push({ home: h.key, away: v.key })
  }
  function remove(h, v) {
    played.get(h.key).delete(v.key)
    played.get(v.key).delete(h.key)
    const a = oppNation.get(h.key)
    a.set(v.country, a.get(v.country) - 1)
    const b = oppNation.get(v.key)
    b.set(h.country, b.get(h.country) - 1)
    fixtures.pop()
  }

  // Every club hosts exactly one opponent from each pot and visits exactly
  // one from each pot: 16 ordered pot pairs x 9 clubs = 144 matches.
  const jobs = []
  for (let p = 0; p < 4; p++) {
    for (let q = 0; q < 4; q++) {
      shuffle(pots[p], rng).forEach((host) => jobs.push({ host, q }))
    }
  }
  const usedVisitor = new Set() // `${hostPot}:${visitorKey}` -> visitor already visits one from that pot
  let budget = 40000

  function solve(i) {
    if (i === jobs.length) return true
    if (budget-- <= 0) return false
    const { host, q } = jobs[i]
    const hostPot = potOf.get(host.key)
    for (const visitor of shuffle(pots[q], rng)) {
      if (usedVisitor.has(`${hostPot}:${visitor.key}`)) continue
      if (!canPlay(host, visitor)) continue
      add(host, visitor)
      usedVisitor.add(`${hostPot}:${visitor.key}`)
      if (solve(i + 1)) return true
      usedVisitor.delete(`${hostPot}:${visitor.key}`)
      remove(host, visitor)
      if (budget <= 0) return false
    }
    return false
  }

  return solve(0) ? fixtures : null
}

// Matchday scheduling: repeatedly pull a perfect matching out of the
// remaining 8-regular fixture graph. Falls back to extra matchdays if the
// graph can't be perfectly 8-coloured.
function scheduleMatchdays(fixtures, teamKeys, rng, matchdayCount = 8) {
  for (let attempt = 0; attempt < 120; attempt++) {
    let remaining = shuffle(fixtures, rng)
    const days = []
    let ok = true
    for (let d = 0; d < matchdayCount && ok; d++) {
      const adj = new Map(teamKeys.map((k) => [k, []]))
      remaining.forEach((f, idx) => {
        adj.get(f.home).push({ idx, other: f.away })
        adj.get(f.away).push({ idx, other: f.home })
      })
      const matched = new Set()
      const chosen = []
      let steps = 6000
      const dfs = () => {
        if (steps-- <= 0) return false
        // most-constrained unmatched team first
        let pick = null
        let pickOpts = null
        for (const k of teamKeys) {
          if (matched.has(k)) continue
          const opts = adj.get(k).filter((e) => !matched.has(e.other))
          if (pick == null || opts.length < pickOpts.length) {
            pick = k
            pickOpts = opts
            if (opts.length === 0) return false
          }
        }
        if (pick == null) return true
        for (const e of shuffle(pickOpts, rng)) {
          matched.add(pick)
          matched.add(e.other)
          chosen.push(e.idx)
          if (dfs()) return true
          chosen.pop()
          matched.delete(pick)
          matched.delete(e.other)
        }
        return false
      }
      if (dfs()) {
        const set = new Set(chosen)
        days.push(chosen.map((idx) => remaining[idx]))
        remaining = remaining.filter((_, idx) => !set.has(idx))
      } else {
        ok = false
      }
    }
    if (ok && remaining.length === 0) return days
  }
  // Fallback: greedy first-fit (may use more than 8 matchdays).
  const days = []
  shuffle(fixtures, rng).forEach((f) => {
    let day = days.find((d) => !d.some((g) => g.home === f.home || g.away === f.home || g.home === f.away || g.away === f.away))
    if (!day) {
      day = []
      days.push(day)
    }
    day.push(f)
  })
  return days
}

// Full league-phase draw for 36 clubs. Returns
//   { pots: [[club...] x4], fixtures: [{ id, matchday, home, away }], matchdays }
// Constraints (UEFA's): 2 opponents from each pot (1 home, 1 away), never a
// club from your own association, and at most 2 opponents from any single
// other association. If a user-picked field makes that impossible (e.g. 5+
// clubs from one country), the solver relaxes the nation cap step by step so
// a draw is always produced.
export function drawLeaguePhase(clubs, { rng = Math.random } = {}) {
  const pots = buildPots(clubs)
  let raw = null
  const perCountry = {}
  clubs.forEach((c) => {
    perCountry[c.country] = (perCountry[c.country] || 0) + 1
  })
  const feasible = (cap) =>
    Object.values(perCountry).every((k) => (cap == null ? 8 <= clubs.length - k : 8 * k <= cap * (clubs.length - k)))
  for (const cap of [2, 3, null]) {
    if (!feasible(cap)) continue
    for (let attempt = 0; attempt < 60 && !raw; attempt++) raw = tryDrawOnce(pots, rng, cap)
    if (raw) break
  }
  if (!raw) {
    // Last resort: drop the same-association rule too (degenerate fields).
    raw = fallbackDraw(pots, rng)
  }
  const keys = pots.flat().map((c) => c.key)
  const days = scheduleMatchdays(raw, keys, rng)
  const fixtures = []
  days.forEach((day, d) => {
    shuffle(day, rng).forEach((f, i) => {
      fixtures.push({ id: `md${d + 1}-${i + 1}`, matchday: d + 1, home: f.home, away: f.away })
    })
  })
  return { pots, fixtures, matchdays: days.length }
}

function fallbackDraw(pots, rng) {
  // Ignore nationality: still 1 home + 1 away per pot, no repeats.
  for (let attempt = 0; attempt < 200; attempt++) {
    const fixtures = []
    const played = new Map(pots.flat().map((c) => [c.key, new Set()]))
    let ok = true
    for (let p = 0; p < 4 && ok; p++) {
      for (let q = 0; q < 4 && ok; q++) {
        const visitors = shuffle(pots[q], rng)
        const hosts = shuffle(pots[p], rng)
        const used = new Set()
        for (const h of hosts) {
          const v = visitors.find((x) => !used.has(x.key) && x.key !== h.key && !played.get(h.key).has(x.key))
          if (!v) {
            ok = false
            break
          }
          used.add(v.key)
          played.get(h.key).add(v.key)
          played.get(v.key).add(h.key)
          fixtures.push({ home: h.key, away: v.key })
        }
      }
    }
    if (ok) return fixtures
  }
  return []
}

// ----------------------------------------------------------- the table ----

export function emptyRow(key) {
  return { key, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, awayGf: 0, awayWins: 0 }
}

// `results`: { [fixtureId]: { homeGoals, awayGoals } }. Tiebreakers follow
// UEFA's league-phase order: points, goal difference, goals scored, away
// goals scored, wins, away wins, then club coefficient (stand-in for UEFA's
// disciplinary points / coefficient steps).
export function computeLeagueTable(clubs, fixtures, results) {
  const rows = new Map(clubs.map((c) => [c.key, emptyRow(c.key)]))
  fixtures.forEach((f) => {
    const r = results[f.id]
    if (!r) return
    const h = rows.get(f.home)
    const a = rows.get(f.away)
    h.played++
    a.played++
    h.gf += r.homeGoals
    h.ga += r.awayGoals
    a.gf += r.awayGoals
    a.ga += r.homeGoals
    a.awayGf += r.awayGoals
    if (r.homeGoals > r.awayGoals) {
      h.won++
      h.points += 3
      a.lost++
    } else if (r.homeGoals < r.awayGoals) {
      a.won++
      a.awayWins++
      a.points += 3
      h.lost++
    } else {
      h.drawn++
      a.drawn++
      h.points++
      a.points++
    }
  })
  const coef = new Map(clubs.map((c) => [c.key, c.coef]))
  const list = [...rows.values()]
  list.forEach((r) => {
    r.gd = r.gf - r.ga
  })
  list.sort(
    (x, y) =>
      y.points - x.points ||
      y.gd - x.gd ||
      y.gf - x.gf ||
      y.awayGf - x.awayGf ||
      y.won - x.won ||
      y.awayWins - x.awayWins ||
      coef.get(y.key) - coef.get(x.key)
  )
  return list
}

// ------------------------------------------------- knockout structure ----

export const KO_ROUND_ORDER = ['playoff', 'r16', 'qf', 'sf', 'final']

export const KO_ROUND_LABEL_KEY = {
  playoff: 'ucl.roundPlayoff',
  r16: 'ucl.roundR16',
  qf: 'ucl.roundQF',
  sf: 'ucl.roundSF',
  final: 'ucl.roundFinal',
}

// Play-off groups: seeded pair (league-phase ranks 9-16) v unseeded pair
// (17-24). Each group's two winners are pre-wired into the Round of 16 slot
// of one seed in the matching top-8 pair, exactly like UEFA's fixed bracket.
const PLAYOFF_GROUPS = [
  { id: 'A', seeded: [9, 10], unseeded: [23, 24], r16Seeds: [7, 8] },
  { id: 'B', seeded: [11, 12], unseeded: [21, 22], r16Seeds: [5, 6] },
  { id: 'C', seeded: [13, 14], unseeded: [19, 20], r16Seeds: [3, 4] },
  { id: 'D', seeded: [15, 16], unseeded: [17, 18], r16Seeds: [1, 2] },
]

// Round of 16 slots top-to-bottom. Halves keep seeds 1 and 2 apart, and the
// quarter-final pairings are 1v8, 3v5 | 4v6, 2v7 sides, as in the real
// bracket.
const R16_SEED_ORDER = [1, 8, 3, 5, 4, 6, 2, 7]

// Build the knockout bracket from the final league-phase order (array of club
// keys, index 0 = 1st). Randomness only decides which unseeded club each
// seeded club gets, and which play-off winner lands on which top-8 seed.
export function drawKnockoutBracket(orderKeys, { rng = Math.random } = {}) {
  const at = (rank) => orderKeys[rank - 1]
  const ties = {}
  const playoffTieIds = []
  const r16TieBySeed = {}
  R16_SEED_ORDER.forEach((seed, slot) => {
    const id = `r16-${slot}`
    r16TieBySeed[seed] = id
    ties[id] = { id, round: 'r16', a: at(seed), b: null, result: null, seed }
  })

  const groups = PLAYOFF_GROUPS.map((g) => {
    const unseeded = shuffle(g.unseeded, rng)
    const winnerSeeds = shuffle(g.r16Seeds, rng)
    const tieIds = g.seeded.map((s, i) => {
      const id = `po-${g.id}${i + 1}`
      ties[id] = { id, round: 'playoff', a: at(unseeded[i]), b: at(s), result: null, group: g.id, seededRank: s }
      playoffTieIds.push(id)
      return id
    })
    return { ...g, tieIds, winnerSeeds }
  })

  const advancesTo = {}
  groups.forEach((g) => {
    g.tieIds.forEach((tieId, i) => {
      const target = r16TieBySeed[g.winnerSeeds[i]]
      advancesTo[tieId] = { id: target, slot: 'b' }
    })
  })

  const r16Ids = R16_SEED_ORDER.map((_, slot) => `r16-${slot}`)
  const qfIds = [0, 1, 2, 3].map((i) => `qf-${i}`)
  qfIds.forEach((id, i) => {
    ties[id] = { id, round: 'qf', a: null, b: null, result: null }
    advancesTo[r16Ids[i * 2]] = { id, slot: 'a' }
    advancesTo[r16Ids[i * 2 + 1]] = { id, slot: 'b' }
  })
  const sfIds = [0, 1].map((i) => `sf-${i}`)
  sfIds.forEach((id, i) => {
    ties[id] = { id, round: 'sf', a: null, b: null, result: null }
    advancesTo[qfIds[i * 2]] = { id, slot: 'a' }
    advancesTo[qfIds[i * 2 + 1]] = { id, slot: 'b' }
  })
  ties.final = { id: 'final', round: 'final', a: null, b: null, result: null }
  advancesTo[sfIds[0]] = { id: 'final', slot: 'a' }
  advancesTo[sfIds[1]] = { id: 'final', slot: 'b' }

  const order = [...playoffTieIds, ...r16Ids, ...qfIds, ...sfIds, 'final']
  return { ties, advancesTo, order, playoffTieIds, r16Ids, qfIds, sfIds, groups }
}

// Records a tie result and pushes the winner into the next round's slot.
// Returns a fresh bracket (ties object is copied; structure is shared).
export function applyTieResult(bracket, tieId, result) {
  const ties = { ...bracket.ties, [tieId]: { ...bracket.ties[tieId], result } }
  const next = bracket.advancesTo[tieId]
  if (next && result.winner) {
    ties[next.id] = { ...ties[next.id], [next.slot]: result.winner }
  }
  return { ...bracket, ties }
}

export function tieIsReady(tie) {
  return !!(tie.a && tie.b && !tie.result)
}

// The next tie to play in natural order, or null when everything is done.
export function nextPlayableTieId(bracket) {
  return bracket.order.find((id) => tieIsReady(bracket.ties[id])) || null
}

// All tie ids a club passes through if it keeps winning, starting from the
// tie it currently sits in.
export function pathForClub(bracket, clubKey) {
  let startId = null
  for (const id of bracket.order) {
    const t = bracket.ties[id]
    if (t.a === clubKey || t.b === clubKey) {
      startId = id
      break
    }
  }
  const path = []
  let cur = startId
  while (cur) {
    path.push(cur)
    cur = bracket.advancesTo[cur]?.id || null
  }
  return path
}

// Every club that could still show up in `tieId`'s slot ('a'/'b'): the known
// occupant, or everyone still alive in the feeding sub-bracket.
export function contendersForSlot(bracket, tieId, slot) {
  const tie = bracket.ties[tieId]
  if (tie[slot]) return [tie[slot]]
  const feeders = Object.entries(bracket.advancesTo).filter(([, n]) => n.id === tieId && n.slot === slot).map(([from]) => from)
  const out = []
  feeders.forEach((f) => {
    const ft = bracket.ties[f]
    if (ft.result) out.push(ft.result.winner)
    else {
      out.push(...contendersForSlot(bracket, f, 'a'))
      out.push(...contendersForSlot(bracket, f, 'b'))
    }
  })
  return out
}

// ------------------------------------------- qualifying (Rest of Europe) ----

// Weighted sample without replacement; stronger clubs are likelier but a
// long shot can still sneak through. `perCountryLimit` caps how many clubs
// from any single association end up in the sample, counting `existing`
// clubs that are already in the field.
export function weightedPick(pool, count, { rng = Math.random, temperature = 6, perCountryLimit = null, existing = [] } = {}) {
  const counts = {}
  existing.forEach((c) => {
    counts[c.country] = (counts[c.country] || 0) + 1
  })
  let remaining = [...pool]
  const picked = []
  while (picked.length < count) {
    if (perCountryLimit != null) remaining = remaining.filter((c) => (counts[c.country] || 0) < perCountryLimit)
    if (!remaining.length) break
    const weights = remaining.map((c) => Math.exp((c.rating - 60) / temperature))
    const total = weights.reduce((s, w) => s + w, 0)
    let r = rng() * total
    let idx = 0
    for (; idx < remaining.length; idx++) {
      r -= weights[idx]
      if (r <= 0) break
    }
    const [club] = remaining.splice(Math.min(idx, remaining.length - 1), 1)
    counts[club.country] = (counts[club.country] || 0) + 1
    picked.push(club)
  }
  return picked
}

// "Rest of Europe" qualifying play-off round: 2 x (open places) clubs from
// every other association contest two-legged ties (seeded by coefficient:
// best v worst); the winners take the remaining league-phase places.
export function simulateQualifyingPlayoff(pool, spots, { rng = Math.random, lockedIn = [], perCountryLimit = null } = {}) {
  const need = spots - lockedIn.length
  if (need <= 0) return { entrants: lockedIn, ties: [] }
  const available = pool.filter((c) => !lockedIn.some((l) => l.key === c.key))
  const contenders = sortByCoefficient(weightedPick(available, need * 2, { rng, temperature: 7, perCountryLimit, existing: lockedIn }))
  const ties = []
  const winners = []
  for (let i = 0; i < need; i++) {
    const seeded = contenders[i]
    const unseeded = contenders[contenders.length - 1 - i]
    if (!seeded || !unseeded || unseeded.key === seeded.key) break
    const result = simulateTwoLeggedTie(unseeded, seeded, { rng })
    ties.push({ seeded, unseeded, result })
    winners.push(result.winner === seeded.key ? seeded : unseeded)
  }
  return { entrants: [...lockedIn, ...winners], ties }
}
