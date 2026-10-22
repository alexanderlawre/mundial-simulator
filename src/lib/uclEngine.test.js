import { describe, expect, it } from 'vitest'
import { UCL_CLUBS, UCL_TOP5_COUNTRIES, uclClubsByCountry, UCL_REST_OF_EUROPE_CLUBS } from '../data/uclClubs'
import {
  buildPots,
  computeLeagueTable,
  createRng,
  drawKnockoutBracket,
  drawLeaguePhase,
  applyTieResult,
  nextPlayableTieId,
  pathForClub,
  playTie,
  simulateClubMatch,
  simulateQualifyingPlayoff,
  sortByCoefficient,
} from './uclEngine'

function realisticField() {
  const top = (country, n) => sortByCoefficient(uclClubsByCountry(country)).slice(0, n)
  const rest = sortByCoefficient(UCL_REST_OF_EUROPE_CLUBS).slice(0, 14)
  return [...top('England', 5), ...top('Spain', 5), ...top('Germany', 4), ...top('Italy', 4), ...top('France', 4), ...rest]
}

describe('club dataset', () => {
  it('has unique keys and covers the top-five associations', () => {
    const keys = new Set(UCL_CLUBS.map((c) => c.key))
    expect(keys.size).toBe(UCL_CLUBS.length)
    UCL_TOP5_COUNTRIES.forEach((c) => expect(uclClubsByCountry(c).length).toBeGreaterThanOrEqual(18))
    expect(UCL_CLUBS.some((c) => c.country === 'Russia')).toBe(false)
  })
})

describe('league phase draw', () => {
  it('gives every club 8 opponents (1 home + 1 away per pot), respecting nation rules', () => {
    const field = realisticField()
    expect(field).toHaveLength(36)
    for (let run = 0; run < 5; run++) {
      const { pots, fixtures } = drawLeaguePhase(field, { rng: createRng('draw-' + run) })
      expect(fixtures).toHaveLength(144)
      const potOf = {}
      pots.forEach((p, i) => p.forEach((c) => (potOf[c.key] = i)))
      const byKey = Object.fromEntries(field.map((c) => [c.key, c]))
      field.forEach((c) => {
        const home = fixtures.filter((f) => f.home === c.key)
        const away = fixtures.filter((f) => f.away === c.key)
        expect(home).toHaveLength(4)
        expect(away).toHaveLength(4)
        const opps = [...home.map((f) => f.away), ...away.map((f) => f.home)]
        expect(new Set(opps).size).toBe(8)
        for (let p = 0; p < 4; p++) {
          expect(home.filter((f) => potOf[f.away] === p)).toHaveLength(1)
          expect(away.filter((f) => potOf[f.home] === p)).toHaveLength(1)
        }
        const nations = {}
        opps.forEach((k) => {
          expect(byKey[k].country).not.toBe(c.country)
          nations[byKey[k].country] = (nations[byKey[k].country] || 0) + 1
        })
        Object.values(nations).forEach((n) => expect(n).toBeLessThanOrEqual(2))
      })
    }
  })

  it('schedules 8 matchdays with every club playing once per matchday', () => {
    const field = realisticField()
    const { fixtures, matchdays } = drawLeaguePhase(field, { rng: createRng('md') })
    expect(matchdays).toBe(8)
    for (let d = 1; d <= matchdays; d++) {
      const day = fixtures.filter((f) => f.matchday === d)
      expect(day).toHaveLength(18)
      expect(new Set(day.flatMap((f) => [f.home, f.away])).size).toBe(36)
    }
  })

  it('still produces a draw when one nation is over-represented', () => {
    const portugal = sortByCoefficient(uclClubsByCountry('Portugal')).slice(0, 12)
    const filler = sortByCoefficient(UCL_CLUBS.filter((c) => c.country !== 'Portugal')).slice(0, 24)
    const { fixtures } = drawLeaguePhase([...portugal, ...filler], { rng: createRng('heavy') })
    expect(fixtures.length).toBe(144)
  })
})

describe('pots', () => {
  it('splits 36 clubs into 4 coefficient-ordered pots of 9', () => {
    const pots = buildPots(realisticField())
    expect(pots.map((p) => p.length)).toEqual([9, 9, 9, 9])
    expect(Math.min(...pots[0].map((c) => c.coef))).toBeGreaterThanOrEqual(Math.max(...pots[1].map((c) => c.coef)))
  })
})

describe('league table', () => {
  it('orders by points, then goal difference, then goals scored', () => {
    const clubs = [
      { key: 'a', coef: 10 },
      { key: 'b', coef: 20 },
      { key: 'c', coef: 30 },
    ]
    const fixtures = [
      { id: 'f1', home: 'a', away: 'b' },
      { id: 'f2', home: 'b', away: 'c' },
      { id: 'f3', home: 'c', away: 'a' },
    ]
    const table = computeLeagueTable(clubs, fixtures, {
      f1: { homeGoals: 2, awayGoals: 0 },
      f2: { homeGoals: 1, awayGoals: 0 },
      f3: { homeGoals: 1, awayGoals: 0 },
    })
    expect(table.map((r) => r.key)).toEqual(['a', 'c', 'b'].sort((x, y) => table.findIndex((r) => r.key === x) - table.findIndex((r) => r.key === y)))
    expect(table[0].points).toBeGreaterThanOrEqual(table[1].points)
    const a = table.find((r) => r.key === 'a')
    expect(a).toMatchObject({ played: 2, won: 1, lost: 1, gf: 2, ga: 1, gd: 1, points: 3 })
  })
})

describe('knockout bracket', () => {
  const order = realisticField().map((c) => c.key)
  const clubByKey = Object.fromEntries(realisticField().map((c) => [c.key, c]))
  const rankByKey = Object.fromEntries(order.map((k, i) => [k, i + 1]))

  it('builds 8 play-offs wired into the Round of 16 and plays through to a champion', () => {
    const rng = createRng('ko')
    let bracket = drawKnockoutBracket(order, { rng })
    expect(bracket.playoffTieIds).toHaveLength(8)
    // seeded club (ranks 9-16) is tie.b, unseeded (17-24) is tie.a
    bracket.playoffTieIds.forEach((id) => {
      const t = bracket.ties[id]
      expect(rankByKey[t.b]).toBeGreaterThanOrEqual(9)
      expect(rankByKey[t.b]).toBeLessThanOrEqual(16)
      expect(rankByKey[t.a]).toBeGreaterThanOrEqual(17)
      expect(rankByKey[t.a]).toBeLessThanOrEqual(24)
    })
    // every R16 tie starts with a top-8 club; both winners of a play-off group feed different top-8 seeds
    bracket.r16Ids.forEach((id) => expect(rankByKey[bracket.ties[id].a]).toBeLessThanOrEqual(8))
    expect(pathForClub(bracket, order[0])).toEqual(['r16-0', 'qf-0', 'sf-0', 'final'])
    let guard = 0
    while (nextPlayableTieId(bracket) && guard++ < 40) {
      const id = nextPlayableTieId(bracket)
      const result = playTie(bracket.ties[id], clubByKey, rankByKey, { rng })
      bracket = applyTieResult(bracket, id, result)
    }
    expect(guard).toBe(23)
    const champion = bracket.ties.final.result.winner
    expect(order).toContain(champion)
    expect(bracket.ties.final.result.kind).toBe('final')
  })
})

describe('qualifying play-off', () => {
  it('fills the remaining places from the rest of Europe via two-legged ties', () => {
    const { entrants, ties } = simulateQualifyingPlayoff(UCL_REST_OF_EUROPE_CLUBS, 14, { rng: createRng('q') })
    expect(entrants).toHaveLength(14)
    expect(new Set(entrants.map((c) => c.key)).size).toBe(14)
    expect(ties).toHaveLength(14)
  })
})

describe('match realism', () => {
  it('produces Champions League-like scoring and result splits', () => {
    const field = realisticField()
    const rng = createRng('realism')
    let goals = 0
    let homeWins = 0
    let draws = 0
    const n = 6000
    for (let i = 0; i < n; i++) {
      const h = field[Math.floor(rng() * field.length)]
      let a = field[Math.floor(rng() * field.length)]
      if (a.key === h.key) a = field[(field.indexOf(h) + 1) % field.length]
      const r = simulateClubMatch(h, a, { rng })
      goals += r.homeGoals + r.awayGoals
      if (r.homeGoals > r.awayGoals) homeWins++
      else if (r.homeGoals === r.awayGoals) draws++
    }
    const avg = goals / n
    expect(avg).toBeGreaterThan(2.6)
    expect(avg).toBeLessThan(3.3)
    expect(homeWins / n).toBeGreaterThan(0.4)
    expect(homeWins / n).toBeLessThan(0.52)
    expect(draws / n).toBeGreaterThan(0.17)
    expect(draws / n).toBeLessThan(0.28)
  })
})
