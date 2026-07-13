import { getRating } from '../data/ratings'
import { getNation } from '../data/nations'
import { seededRng } from './nameGenerator'
import { simulateMatch } from './matchEngine'
import { USSRFlag, YugoslaviaFlag, EastGermanyFlag, ZaireFlag } from '../data/historicFlags.jsx'

// Nations that no longer exist under this name -- mapped to the closest
// current FIFA member for rating/confederation lookup only, per user instruction
// ("use the closest thing, like Russia for the Soviet Union"). The historical
// display name is preserved; only the rating/confederation lookup is aliased.
const HISTORIC_ALIASES = {
  'Soviet Union': 'Russia',
  'Yugoslavia': 'Serbia',
  'Czechoslovakia': 'Czechia',
  'East Germany': 'Germany',
  'West Germany': 'Germany',
  'Zaire': 'DR Congo',
  'Dutch East Indies': 'Indonesia',
}

// Real historical flags, independent of the rating alias above (e.g. Dutch
// East Indies played under the Dutch tricolor, not Indonesia's flag).
// Czechoslovakia/West Germany/Dutch East Indies reuse identical modern flag
// designs (fi-cz, fi-de, fi-nl); the rest get hand-authored SVGs.
const HISTORIC_FLAG_OVERRIDES = {
  'Soviet Union': { customFlag: USSRFlag },
  'Yugoslavia': { customFlag: YugoslaviaFlag },
  'Czechoslovakia': { iso2: 'cz' },
  'East Germany': { customFlag: EastGermanyFlag },
  'West Germany': { iso2: 'de' },
  'Zaire': { customFlag: ZaireFlag },
  'Dutch East Indies': { iso2: 'nl' },
}

const HISTORIC_FIFA_CODES = {
  'Soviet Union': 'URS',
  'Yugoslavia': 'YUG',
  'Czechoslovakia': 'TCH',
  'East Germany': 'GDR',
  'West Germany': 'FRG',
  'Zaire': 'ZAI',
  'Dutch East Indies': 'DEI',
}

function fifaCodeFallback(name) {
  return name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
}

// Build a `{ name, rating, confederation, colors, iso2, customFlag, fifaCode }`
// team object from a plain nation name, optionally overriding rating (used by
// historic cups).
export function buildTeam(name, ratingOverride) {
  const lookupName = HISTORIC_ALIASES[name] || name
  const nation = getNation(lookupName) || { name, confederation: 'UEFA', colors: ['#334155', '#94A3B8'], iso2: 'UN' }
  const rating = ratingOverride != null ? ratingOverride : getRating(lookupName, nation.confederation)
  const flagOverride = HISTORIC_FLAG_OVERRIDES[name]
  const iso2 = flagOverride?.iso2 || nation.iso2
  const customFlag = flagOverride?.customFlag || nation.customFlag
  const fifaCode = HISTORIC_FIFA_CODES[name] || nation.fifaCode || fifaCodeFallback(name)
  return { name, rating, confederation: nation.confederation, colors: nation.colors, iso2, customFlag, fifaCode }
}

// ---------- Group seeding ----------

// Distribute `count` teams into `groupCount` groups as evenly as possible,
// e.g. (13, 4) -> [4,3,3,3].
export function groupSizes(count, groupCount) {
  const base = Math.floor(count / groupCount)
  const remainder = count % groupCount
  return Array.from({ length: groupCount }, (_, i) => base + (i < remainder ? 1 : 0))
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Pot-based, confederation-aware draw. `teams` are team objects (with
// .rating and .confederation). Produces { A: [...], B: [...], ... }.
export function seedGroupDraw(teams, groupCount, seedKey = 'draw') {
  const rng = seededRng(seedKey)
  const sizes = groupSizes(teams.length, groupCount)
  const groups = Array.from({ length: groupCount }, () => [])
  const maxPerConf = (conf) => (conf === 'UEFA' ? 2 : 1)

  const sorted = [...teams].sort((a, b) => b.rating - a.rating)

  // Split into pots of size groupCount (last pot may be short).
  const pots = []
  for (let i = 0; i < sorted.length; i += groupCount) {
    pots.push(sorted.slice(i, i + groupCount))
  }

  pots.forEach((pot, potIndex) => {
    // Shuffle within the pot for variety.
    const shuffled = [...pot]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // The top pot -- the best `groupCount` teams overall (top 12 for a
    // 48-team/12-group draw, top 8 for 32-team/8-group) -- is placed with a
    // strict one-per-group permutation rather than the random-with-fallback
    // placement below. That placement loop only guarantees against a
    // confederation-cap collision, not against two top-rated teams landing
    // in the same group, so without this the strongest sides could still be
    // drawn together. A permutation guarantees each of them lands in a
    // distinct group, matching real World Cup top-seed placement.
    if (potIndex === 0 && shuffled.length === groupCount) {
      const order = Array.from({ length: groupCount }, (_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      shuffled.forEach((team, i) => {
        groups[order[i]].push(team)
      })
      return
    }

    shuffled.forEach((team) => {
      // Candidate groups: not yet full, in random order.
      const order = Array.from({ length: groupCount }, (_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      let placed = false
      for (const gi of order) {
        if (groups[gi].length >= sizes[gi]) continue
        const confCount = groups[gi].filter((t) => t.confederation === team.confederation).length
        if (confCount >= maxPerConf(team.confederation)) continue
        groups[gi].push(team)
        placed = true
        break
      }
      if (!placed) {
        // Fallback: first group with room, ignoring confederation cap.
        for (const gi of order) {
          if (groups[gi].length < sizes[gi]) {
            groups[gi].push(team)
            placed = true
            break
          }
        }
      }
    })
  })

  const result = {}
  groups.forEach((g, i) => {
    result[LETTERS[i]] = g
  })
  return result
}

// ---------- Fixtures ----------

export function roundRobinFixtures(groupTeamNames) {
  const fixtures = []
  for (let i = 0; i < groupTeamNames.length; i++) {
    for (let j = i + 1; j < groupTeamNames.length; j++) {
      fixtures.push([groupTeamNames[i], groupTeamNames[j]])
    }
  }
  return fixtures
}

// Circle-method round-robin: every team plays every other team exactly once,
// spread across `n-1` matchday rounds (3 rounds for the standard 4-team
// group, or 3 rounds with one bye per round for a 3-team group). Round order
// is then randomized so "Matchday 1" isn't always the same pairing.
// Returns an array of rounds, each an array of [nameA, nameB] pairs.
export function scheduleGroupRounds(teamNames, seedKey = 'sched') {
  const rng = seededRng(seedKey)
  const names = [...teamNames]
  if (names.length % 2 !== 0) names.push(null) // phantom bye seat
  const n = names.length
  const arr = [...names]
  const rounds = []
  for (let r = 0; r < n - 1; r++) {
    const roundPairs = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== null && b !== null) roundPairs.push([a, b])
    }
    rounds.push(roundPairs)
    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop())
    arr.splice(0, arr.length, fixed, ...rest)
  }
  for (let i = rounds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[rounds[i], rounds[j]] = [rounds[j], rounds[i]]
  }
  return rounds
}

// Flattens scheduleGroupRounds() output into a single ordered pairs array
// (matchday 1's fixtures first, then matchday 2's, etc.) plus a parallel
// `matchday` index array so callers can label/group by round.
export function flattenGroupRounds(rounds) {
  const pairs = []
  const matchday = []
  rounds.forEach((round, r) => {
    round.forEach((pair) => {
      pairs.push(pair)
      matchday.push(r)
    })
  })
  return { pairs, matchday }
}

// ---------- Standings ----------

function emptyRow(name) {
  return { team: name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, cards: 0 }
}

export function computeStandings(groupTeamNames, matchResults) {
  const table = Object.fromEntries(groupTeamNames.map((n) => [n, emptyRow(n)]))
  matchResults.forEach((m) => {
    const a = table[m.teamA]
    const b = table[m.teamB]
    if (!a || !b) return
    a.played++; b.played++
    a.gf += m.scoreA; a.ga += m.scoreB
    b.gf += m.scoreB; b.ga += m.scoreA
    a.cards += m.stats?.cardsA ?? 0
    b.cards += m.stats?.cardsB ?? 0
    if (m.scoreA > m.scoreB) { a.won++; b.lost++; a.points += 3 }
    else if (m.scoreA < m.scoreB) { b.won++; a.lost++; b.points += 3 }
    else { a.drawn++; b.drawn++; a.points += 1; b.points += 1 }
  })
  Object.values(table).forEach((r) => { r.gd = r.gf - r.ga })

  const rng = seededRng(groupTeamNames.join('-'))
  const rows = Object.values(table).sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points
    if (r2.gd !== r1.gd) return r2.gd - r1.gd
    if (r2.gf !== r1.gf) return r2.gf - r1.gf
    // Head-to-head when exactly the two teams being compared played each other.
    const h2h = matchResults.find(
      (m) => (m.teamA === r1.team && m.teamB === r2.team) || (m.teamA === r2.team && m.teamB === r1.team)
    )
    if (h2h) {
      const r1Score = h2h.teamA === r1.team ? h2h.scoreA : h2h.scoreB
      const r2Score = h2h.teamA === r2.team ? h2h.scoreA : h2h.scoreB
      if (r1Score !== r2Score) return r2Score - r1Score
    }
    if (r2.cards !== r1.cards) return r1.cards - r2.cards // fewer cards ranks higher
    return rng() - 0.5
  })
  return rows.map((r, i) => ({ ...r, position: i + 1 }))
}

// Rank third-place teams across all groups (for best-third-place advancement).
export function rankThirdPlace(thirdPlaceRows) {
  const rng = seededRng('thirds-' + thirdPlaceRows.map((r) => r.team).join('-'))
  return [...thirdPlaceRows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return rng() - 0.5
  })
}

// ---------- Knockout bracket ----------

// Standard single-elimination seed order (1, N, N/2+1, ...) so seed 1 & 2
// land on opposite halves of the draw across every round.
function seedOrder(n) {
  let seeds = [1]
  while (seeds.length < n) {
    const l = seeds.length * 2
    const next = []
    seeds.forEach((s) => next.push(s, l + 1 - s))
    seeds = next
  }
  return seeds
}

// qualified: array of { team, groupLetter, tier } where tier 0=winner,1=runnerup,2=third
// Returns an ordered array of team names representing bracket slots 0..n-1,
// paired (0,1),(2,3),... in round one.
export function buildBracketSlots(qualified) {
  const n = qualified.length
  const bySeedRank = [...qualified].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    return b.rating - a.rating
  })
  const order = seedOrder(n) // values 1..n
  const slots = new Array(n)
  order.forEach((seedNum, slotIndex) => {
    slots[slotIndex] = bySeedRank[seedNum - 1]
  })

  // Light conflict pass: avoid two teams from the same group meeting in round 1.
  for (let i = 0; i < n; i += 2) {
    const a = slots[i], b = slots[i + 1]
    if (a && b && a.groupLetter && a.groupLetter === b.groupLetter) {
      // Try swapping b with the next pair's partner.
      const nextJ = i + 3 < n ? i + 3 : null
      if (nextJ != null && slots[nextJ].groupLetter !== a.groupLetter) {
        const tmp = slots[i + 1]
        slots[i + 1] = slots[nextJ]
        slots[nextJ] = tmp
      }
    }
  }
  return slots.map((s) => s.team)
}

// Deterministic "real bracket" pairing: winners and runners-up are split so
// that a group's winner and its own runner-up land in OPPOSITE halves of the
// bracket, and therefore can only meet again in the Final -- never in an
// earlier round. (The previous version placed a group-pair's two mirror
// matches, e.g. 1A v 2B and 1B v 2A, in adjacent slots, which the next
// round's pairing then merged back together -- letting a group's own winner
// and runner-up clash as early as the second knockout round. Fixed here.)
// Covers every group-based format by construction:
//  - 8 groups, 0 thirds  -> 4 pairs x2 = 8 matches (Round of 16)
//  - 12 groups, 8 thirds -> 6 pairs x2 = 12 + 4 thirds matches = 16 (R32)
//  - 6 groups, 4 thirds  -> 3 pairs x2 = 6 + 2 thirds matches = 8 (R16)
//  - 4 groups, 0 thirds  -> 2 pairs x2 = 4 matches (Quarterfinals)
//  - 4 groups, 1 advancer -> 2 winner-only pairs = 2 matches (Semifinal)
// NOTE: the literal 2026 World Cup shape (12 groups, 8 thirds) instead uses
// its own irregular real-world draw -- see buildWC2026BracketPairs below,
// which TournamentPlay.jsx prefers whenever the shape matches. This generic
// function remains the fallback for every other group-based format (classic
// 32-team custom simulator, historic cups, etc.).
// groupStandingsByLetter: { A: [rows...], B: [...] } in letter order (rows
// sorted by position, i.e. row[0] = winner, row[1] = runner-up).
// thirdPlaceRankedNames: best-thirds team names already ranked best-to-worst.
export function buildGroupCrisscrossPairs(groupStandingsByLetter, format, thirdPlaceRankedNames = []) {
  const letters = Object.keys(groupStandingsByLetter)
  const winners = letters.map((l) => groupStandingsByLetter[l][0].team)

  if (format.advancePerGroup < 2) {
    const pairs = []
    for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]])
    return pairs
  }

  const runnersUp = letters.map((l) => groupStandingsByLetter[l][1].team)
  // Each group-pair's two mirror matches (1A v 2B, 1B v 2A) go into opposite
  // halves of the round, so they -- and therefore a group's winner and its
  // own runner-up -- can only reconverge in the Final.
  const firstHalf = []
  const secondHalf = []
  for (let i = 0; i < letters.length; i += 2) {
    firstHalf.push([winners[i], runnersUp[i + 1]])
    secondHalf.push([winners[i + 1], runnersUp[i]])
  }

  if (thirdPlaceRankedNames.length) {
    const t = thirdPlaceRankedNames
    const thirdMatches = []
    for (let i = 0; i < t.length / 2; i++) thirdMatches.push([t[i], t[t.length - 1 - i]])
    thirdMatches.forEach((m, i) => {
      if (i % 2 === 0) firstHalf.push(m)
      else secondHalf.push(m)
    })
  }

  return [...firstHalf, ...secondHalf]
}

// ---------- 2026 World Cup real-draw bracket (12 groups A-L, 8 thirds) ----------
// Reproduces FIFA's actual published Round-of-32 structure for the 2026
// World Cup ("Match 73" through "Match 88" on the official schedule), which
// is NOT a simple crisscross: 4 direct runner-up v runner-up pairings (A-B,
// E-I, K-L, D-G), 2 pairs of groups using the classic winner v runner-up
// crisscross (C-F, H-J), and 8 group winners (A, B, D, E, G, I, K, L) each
// drawn against a third-place team from a fixed, winner-specific list of
// eligible source groups (mirroring FIFA's real Annex C combinations table).
// Applies equally to the literal WC2026 mode and the 48-team custom
// simulator mode, since both use identical group letters A-L in the same
// draw order.
const WC26_THIRD_ELIGIBLE = {
  E: ['A', 'B', 'C', 'D', 'F'],
  I: ['C', 'D', 'F', 'G', 'H'],
  A: ['C', 'E', 'F', 'H', 'I'],
  L: ['E', 'H', 'I', 'J', 'K'],
  D: ['B', 'E', 'F', 'I', 'J'],
  G: ['A', 'E', 'H', 'I', 'J'],
  B: ['E', 'F', 'G', 'I', 'J'],
  K: ['D', 'E', 'I', 'J', 'L'],
}

// Ordered R32 bracket slots (bracket position 0..15), each resolved from a
// [role, groupLetter] pair. role: 'winner' | 'runnerup' | 'third'. For
// 'third' entries, groupLetter names the WINNER-side slot (e.g. 'E'); the
// actual qualifying third-place group is resolved via matchThirdsToWinners.
const WC26_R32_SLOTS = [
  { a: ['winner', 'E'], b: ['third', 'E'] },
  { a: ['winner', 'I'], b: ['third', 'I'] },
  { a: ['runnerup', 'A'], b: ['runnerup', 'B'] },
  { a: ['winner', 'F'], b: ['runnerup', 'C'] },
  { a: ['runnerup', 'K'], b: ['runnerup', 'L'] },
  { a: ['winner', 'H'], b: ['runnerup', 'J'] },
  { a: ['winner', 'D'], b: ['third', 'D'] },
  { a: ['winner', 'G'], b: ['third', 'G'] },
  { a: ['winner', 'C'], b: ['runnerup', 'F'] },
  { a: ['runnerup', 'E'], b: ['runnerup', 'I'] },
  { a: ['winner', 'A'], b: ['third', 'A'] },
  { a: ['winner', 'L'], b: ['third', 'L'] },
  { a: ['winner', 'J'], b: ['runnerup', 'H'] },
  { a: ['runnerup', 'D'], b: ['runnerup', 'G'] },
  { a: ['winner', 'B'], b: ['third', 'B'] },
  { a: ['winner', 'K'], b: ['third', 'K'] },
]

// FIFA's real Annex C table (495 rows, one per possible combination of 8
// qualifying third-place groups) is only published as a scanned/graphic PDF
// exhibit -- there's no extractable structured source for it, so it can't be
// reproduced here in full. For most combinations, several different
// winner/third pairings satisfy the eligibility rules above (no team faces
// its own group, etc.), and the generic solver below just picks *a* valid
// one, which may differ from FIFA's specific published choice.
// However, when the exact 8 qualifying groups match what actually happened
// in the real 2026 tournament, we can use the real (verified, uniquely
// determined) assignment directly instead of guessing -- this covers the
// common case of a user recreating the real tournament's results.
const REAL_2026_THIRD_QUALIFIERS = ['B', 'D', 'E', 'F', 'I', 'J', 'K', 'L']
const REAL_2026_WINNER_TO_THIRD = { E: 'D', A: 'E', D: 'B', G: 'I', I: 'F', B: 'J', K: 'L', L: 'K' }

// Bipartite matching (augmenting-path / Kuhn's algorithm): assigns each of
// the 8 "winner needs a third" slots to one of the actual qualifying
// third-place groups, respecting WC26_THIRD_ELIGIBLE. Mirrors how FIFA's real
// Annex C table resolves any of the 495 possible qualifying combinations --
// except that, unlike the real table, this may pick a different valid
// pairing than FIFA's specific published choice for a given combination (see
// REAL_2026_WINNER_TO_THIRD above, which is used instead whenever possible).
function matchThirdsToWinners(qualifyingThirdGroups) {
  const sortedQualifiers = [...qualifyingThirdGroups].sort()
  const isRealCombination =
    sortedQualifiers.length === REAL_2026_THIRD_QUALIFIERS.length &&
    sortedQualifiers.every((g, i) => g === REAL_2026_THIRD_QUALIFIERS[i])
  if (isRealCombination) return REAL_2026_WINNER_TO_THIRD

  const winnerGroups = Object.keys(WC26_THIRD_ELIGIBLE)
  const matchOfThird = {} // thirdGroup -> winnerGroup

  function tryAssign(winnerGroup, visited) {
    const candidates = WC26_THIRD_ELIGIBLE[winnerGroup].filter((g) => qualifyingThirdGroups.includes(g))
    for (const thirdGroup of candidates) {
      if (visited.has(thirdGroup)) continue
      visited.add(thirdGroup)
      if (!(thirdGroup in matchOfThird) || tryAssign(matchOfThird[thirdGroup], visited)) {
        matchOfThird[thirdGroup] = winnerGroup
        return true
      }
    }
    return false
  }

  winnerGroups.forEach((wg) => tryAssign(wg, new Set()))

  const winnerToThird = {}
  Object.entries(matchOfThird).forEach(([thirdGroup, winnerGroup]) => {
    winnerToThird[winnerGroup] = thirdGroup
  })
  return winnerToThird
}

// groupStandingsByLetter: { A: [rows...], ... } (row[0]=winner, row[1]=runnerup).
// thirdPlaceEntries: array of { team, groupLetter } for the 8 qualifying
// third-place teams (any order). Returns the 16 R32 pairs in real bracket order.
export function buildWC2026BracketPairs(groupStandingsByLetter, thirdPlaceEntries) {
  const winnerOf = (g) => groupStandingsByLetter[g][0].team
  const runnerUpOf = (g) => groupStandingsByLetter[g][1].team
  const thirdByGroup = {}
  thirdPlaceEntries.forEach((t) => { thirdByGroup[t.groupLetter] = t.team })
  const qualifyingThirdGroups = Object.keys(thirdByGroup)
  const winnerToThird = matchThirdsToWinners(qualifyingThirdGroups)

  return WC26_R32_SLOTS.map(({ a, b }) => {
    const resolve = ([role, group]) => {
      if (role === 'winner') return winnerOf(group)
      if (role === 'runnerup') return runnerUpOf(group)
      if (role === 'third') return thirdByGroup[winnerToThird[group]]
      return null
    }
    return [resolve(a), resolve(b)]
  })
}

// Builds a match-result object matching simulateMatch()'s output shape, but
// from a user-entered scoreline instead of a simulation -- lets the WC2026
// simulator's "edit result" feature override any match (group or knockout)
// with the user's own prediction. `tiebreakWinner` is only needed for
// knockout matches when the user enters a level scoreline (no draws allowed
// in a knockout); it's ignored for group matches, where a tie just stays a
// draw. computeStandings()/the bracket-advancement logic both key off
// scoreA/scoreB/winner, so this slots in seamlessly wherever a
// simulateMatch() result would normally go.
export function buildManualResult(teamAName, teamBName, scoreA, scoreB, tiebreakWinner = null) {
  let winner = null
  let wentToPenalties = false
  let penA = null
  let penB = null
  if (scoreA > scoreB) {
    winner = teamAName
  } else if (scoreB > scoreA) {
    winner = teamBName
  } else if (tiebreakWinner) {
    winner = tiebreakWinner
    wentToPenalties = true
    penA = tiebreakWinner === teamAName ? 1 : 0
    penB = tiebreakWinner === teamBName ? 1 : 0
  }
  return {
    teamA: teamAName,
    teamB: teamBName,
    scoreA,
    scoreB,
    scorersA: [],
    scorersB: [],
    stats: null,
    wentToPenalties,
    penA,
    penB,
    winner,
    played: true,
    edited: true,
  }
}

export function nextRoundPairs(teamNames) {
  const pairs = []
  for (let i = 0; i < teamNames.length; i += 2) {
    pairs.push([teamNames[i], teamNames[i + 1]])
  }
  return pairs
}

export const ROUND_LABELS = {
  2: 'Final',
  4: 'Semifinals',
  8: 'Quarterfinals',
  16: 'Round of 16',
  32: 'Round of 32',
}

export function roundLabelForTeamCount(count) {
  return ROUND_LABELS[count] || `Round of ${count}`
}

// ---------- Intercontinental playoff (48-team format's last 2 slots) ----------

// legTeams: [teamA, teamB, teamC] team objects matching a PLAYOFF_PATHS_48
// path's `legs` order. teamA v teamB play a knockout semifinal; the winner
// faces teamC (the bye team) in the final. Returns the two match results plus
// the final winner's team name.
export function simulateInterconfedPlayoff(legTeams, seedKey = 'playoff') {
  const [teamA, teamB, teamC] = legTeams
  const semifinal = simulateMatch(teamA, teamB, { knockout: true, seedKey: seedKey + '-semi' })
  const semiWinner = semifinal.winner === teamA.name ? teamA : teamB
  const final = simulateMatch(semiWinner, teamC, { knockout: true, seedKey: seedKey + '-final' })
  return { semifinal, final, winner: final.winner }
}
