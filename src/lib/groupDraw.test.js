import { describe, expect, it } from 'vitest'
import { getQuotas } from '../data/confederationQuotas'
import { simulateFullQualifying, simulateQualifyingForConfederation } from './qualifying'
import { buildTeam, seedGroupDraw } from './tournamentEngine'

function field(n, run) {
  const res = simulateFullQualifying(getQuotas(n), [], `f${n}-${run}-${Math.random()}`)
  const teams = Object.values(res).flat().map((t) => buildTeam(t.name))
  const names = new Set(teams.map((t) => t.name))
  // 48/64-team formats leave two slots to the intercontinental playoffs.
  const confs = ['CONCACAF', 'AFC', 'CAF', 'CONMEBOL', 'OFC']
  let k = 0
  while (teams.length < n) {
    const [pick] = simulateQualifyingForConfederation(confs[k++ % confs.length], 1, [...names], `x${run}-${k}-${Math.random()}`)
    if (pick) {
      teams.push(buildTeam(pick.name))
      names.add(pick.name)
    }
  }
  return teams
}

describe('World Cup group draw', () => {
  it.each([32, 48, 64])('never puts two teams from a confederation in a group (UEFA max two) for %i teams', (n) => {
    for (let run = 0; run < 60; run++) {
      const teams = field(n, run)
      const groups = seedGroupDraw(teams, n / 4, `draw-${run}-${Math.random()}`)
      expect(Object.keys(groups)).toHaveLength(n / 4)
      Object.values(groups).forEach((g) => {
        expect(g).toHaveLength(4)
        const counts = {}
        g.forEach((t) => {
          counts[t.confederation] = (counts[t.confederation] || 0) + 1
        })
        Object.entries(counts).forEach(([conf, c]) => expect(c).toBeLessThanOrEqual(conf === 'UEFA' ? 2 : 1))
      })
    }
  })

  it('keeps single-confederation tournaments evenly balanced', () => {
    const euro = simulateFullQualifying({ UEFA: 24 }, [], 'euro').UEFA.map((t) => buildTeam(t.name))
    const groups = seedGroupDraw(euro, 6, 'euro-draw')
    Object.values(groups).forEach((g) => expect(g).toHaveLength(4))
  })
})
