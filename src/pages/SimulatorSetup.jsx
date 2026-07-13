import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { nationsByConfederation, CONFEDERATIONS } from '../data/nations'
import { getQuotas, totalFromQuotas, PLAYOFF_PATHS_48 } from '../data/confederationQuotas'
import { getRating } from '../data/ratings'
import { simulateFullQualifying, simulateQualifyingForConfederation } from '../lib/qualifying'
import { buildTeam, simulateInterconfedPlayoff } from '../lib/tournamentEngine'
import CountryFlag from '../components/CountryFlag'
import SambaButton from '../components/SambaButton'
import AppBackground from '../components/AppBackground'
import NavBar from '../components/NavBar'
import MatchCard from '../components/MatchCard'

export default function SimulatorSetup() {
  const navigate = useNavigate()
  const [teamCount, setTeamCount] = useState(null)
  const [picked, setPicked] = useState({}) // confederation -> [nation names]

  const quotas = teamCount ? getQuotas(teamCount) : null

  const pickedFlat = useMemo(
    () => Object.entries(picked).flatMap(([conf, names]) => names.map((n) => ({ name: n, confederation: conf }))),
    [picked]
  )

  // Intercontinental playoff (48-team format only): 2 mini-knockouts decide
  // the last 2 slots beyond the 46 direct quota picks.
  const [playoffEntrants, setPlayoffEntrants] = useState(() => PLAYOFF_PATHS_48.map((p) => p.legs.map(() => null)))
  const [playoffResults, setPlayoffResults] = useState(() => PLAYOFF_PATHS_48.map(() => null))

  const playoffUsedNames = useMemo(() => {
    const names = new Set(pickedFlat.map((t) => t.name))
    playoffEntrants.forEach((legs) => legs.forEach((n) => { if (n) names.add(n) }))
    return names
  }, [pickedFlat, playoffEntrants])

  function setPlayoffEntrant(pathIdx, legIdx, name) {
    setPlayoffEntrants((prev) => {
      const next = prev.map((legs) => [...legs])
      next[pathIdx][legIdx] = name || null
      return next
    })
    setPlayoffResults((prev) => prev.map((r, i) => (i === pathIdx ? null : r)))
  }

  function autoFillPlayoffEntrants() {
    const used = new Set(pickedFlat.map((t) => t.name))
    playoffEntrants.forEach((legs) => legs.forEach((n) => { if (n) used.add(n) }))
    const next = playoffEntrants.map((legs) => [...legs])
    PLAYOFF_PATHS_48.forEach((path, pathIdx) => {
      path.legs.forEach((conf, legIdx) => {
        if (next[pathIdx][legIdx]) return
        const [pick] = simulateQualifyingForConfederation(conf, 1, Array.from(used), 'playoff-' + pathIdx + '-' + legIdx)
        if (pick) {
          next[pathIdx][legIdx] = pick.name
          used.add(pick.name)
        }
      })
    })
    setPlayoffEntrants(next)
    setPlayoffResults(PLAYOFF_PATHS_48.map(() => null))
  }

  function simulatePlayoffPath(pathIdx) {
    const path = PLAYOFF_PATHS_48[pathIdx]
    const legTeams = playoffEntrants[pathIdx].map((name) => buildTeam(name))
    const result = simulateInterconfedPlayoff(legTeams, 'playoff-' + path.id)
    setPlayoffResults((prev) => prev.map((r, i) => (i === pathIdx ? result : r)))
  }

  function togglePick(conf, nationName) {
    setPicked((prev) => {
      const current = prev[conf] || []
      const quota = quotas[conf]
      if (current.includes(nationName)) {
        return { ...prev, [conf]: current.filter((n) => n !== nationName) }
      }
      if (current.length >= quota) return prev
      return { ...prev, [conf]: [...current, nationName] }
    })
  }

  function simulateQualifyingAll() {
    const already = pickedFlat.map((t) => buildTeam(t.name))
    // Explicit random seed per click -- simulateFullQualifying() defaults to a
    // fixed seed, which without this would deterministically pick the exact
    // same qualifiers every single time "Simulate Qualifying" is pressed.
    const result = simulateFullQualifying(quotas, already, 'qual-' + Date.now() + '-' + Math.random())
    const next = {}
    Object.entries(result).forEach(([conf, teams]) => {
      next[conf] = teams.map((t) => t.name)
    })
    setPicked(next)
  }

  function simulateQualifyingForConf(conf) {
    const already = (picked[conf] || []).map((n) => buildTeam(n))
    const result = simulateFullQualifying({ [conf]: quotas[conf] }, already, 'qual-' + conf + '-' + Date.now() + '-' + Math.random())
    setPicked((prev) => ({ ...prev, [conf]: result[conf].map((t) => t.name) }))
  }

  const totalNeeded = quotas ? totalFromQuotas(quotas) : 0
  const totalPicked = pickedFlat.length
  const directPicksDone = teamCount && totalPicked === totalNeeded
  const playoffDone = teamCount === 48 ? playoffResults.every((r) => r) : true
  const readyToDraw = directPicksDone && playoffDone

  function goToDraw() {
    const directNames = pickedFlat.map((t) => t.name)
    const playoffWinnerNames = teamCount === 48 ? playoffResults.map((r) => r.winner) : []
    navigate('/simulator/draw', { state: { teamCount, teamNames: [...directNames, ...playoffWinnerNames] } })
  }

  if (!teamCount) {
    return (
      <AppBackground>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="text-left mb-8">
            <NavBar />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-forest dark:text-mint mb-2">Custom World Cup</h1>
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-8">How many teams should compete?</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {[32, 48].map((n) => (
              <button
                key={n}
                onClick={() => setTeamCount(n)}
                className="rounded-2xl bg-white dark:bg-night-card shadow-depth-lg p-8 hover:-translate-y-1 transition-all"
              >
                <p className="font-display text-4xl font-extrabold text-emerald">{n}</p>
                <p className="text-charcoal-600 dark:text-charcoal-300 mt-2">{n === 32 ? 'Classic format (pre-2026)' : '2026 format · 12 groups of 4'}</p>
              </button>
            ))}
          </div>
        </div>
      </AppBackground>
    )
  }

  return (
    <AppBackground>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <NavBar title={`Pick Your ${teamCount} Teams`} subtitle={`${totalPicked} / ${totalNeeded} selected`} />
          </div>
          <div className="flex gap-2">
            <SambaButton variant="outline" size="sm" onClick={() => { setTeamCount(null); setPicked({}) }}>
              Change Format
            </SambaButton>
            <SambaButton variant="gold" size="sm" onClick={simulateQualifyingAll}>
              Simulate All Qualifying
            </SambaButton>
          </div>
        </div>

        <div className="space-y-6">
          {CONFEDERATIONS.map((conf) => {
            const quota = quotas[conf]
            if (quota === 0) return null
            const nations = nationsByConfederation(conf).sort(
              (a, b) => getRating(b.name, conf) - getRating(a.name, conf)
            )
            const selected = picked[conf] || []
            return (
              <div key={conf} className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-charcoal-900 dark:text-sand">
                    {conf} <span className="text-charcoal-600 dark:text-charcoal-300 text-sm tabular-nums">({selected.length}/{quota})</span>
                  </h2>
                  <SambaButton variant="secondary" size="sm" onClick={() => simulateQualifyingForConf(conf)}>
                    Simulate Qualifying
                  </SambaButton>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
                  {nations.map((n) => {
                    const isSelected = selected.includes(n.name)
                    const disabled = !isSelected && selected.length >= quota
                    return (
                      <button
                        key={n.name}
                        disabled={disabled}
                        onClick={() => togglePick(conf, n.name)}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm transition-all
                          ${isSelected ? 'bg-mint ring-2 ring-emerald' : 'hover:bg-sand dark:hover:bg-night'}
                          ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <CountryFlag nation={n} size="sm" />
                        <span className="truncate text-charcoal-900 dark:text-sand">{n.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {teamCount === 48 && directPicksDone && (
          <div className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-4 mt-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display font-semibold text-charcoal-900 dark:text-sand">Intercontinental Playoff</h2>
                <p className="text-charcoal-600 dark:text-charcoal-300 text-sm">The final 2 slots are decided by two 3-team mini-knockouts.</p>
              </div>
              <SambaButton variant="secondary" size="sm" onClick={autoFillPlayoffEntrants}>Auto-fill Entrants</SambaButton>
            </div>
            {PLAYOFF_PATHS_48.map((path, pathIdx) => {
              const entrants = playoffEntrants[pathIdx]
              const result = playoffResults[pathIdx]
              const allPicked = entrants.every((n) => n)
              return (
                <div key={path.id} className="rounded-xl bg-sand/40 dark:bg-night/40 p-3 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-charcoal-600 dark:text-charcoal-300 font-semibold">
                    Path {pathIdx + 1}: {path.legs[0]} v {path.legs[1]}, winner v {path.legs[2]}
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {path.legs.map((conf, legIdx) => {
                      const selectedName = entrants[legIdx]
                      const options = nationsByConfederation(conf)
                        .filter((n) => !playoffUsedNames.has(n.name) || selectedName === n.name)
                        .sort((a, b) => getRating(b.name, conf) - getRating(a.name, conf))
                      return (
                        <div key={legIdx}>
                          <p className="text-[11px] text-charcoal-600 dark:text-charcoal-300 mb-1">{conf}{legIdx === 2 ? ' (bye)' : ''}</p>
                          <select
                            className="w-full rounded-lg border border-charcoal-900/10 dark:border-white/10 px-2 py-1.5 text-sm bg-white dark:bg-night-card"
                            value={selectedName || ''}
                            onChange={(e) => setPlayoffEntrant(pathIdx, legIdx, e.target.value)}
                          >
                            <option value="">Choose {conf} team&hellip;</option>
                            {options.map((n) => (
                              <option key={n.name} value={n.name}>{n.name}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                  {allPicked && (
                    <div className="flex justify-center">
                      <SambaButton
                        variant={result ? 'outline' : 'gold'}
                        size="sm"
                        onClick={() => simulatePlayoffPath(pathIdx)}
                      >
                        {result ? 'Re-simulate Path' : 'Simulate Playoff Path'}
                      </SambaButton>
                    </div>
                  )}
                  {result && (
                    <div className="space-y-2">
                      <MatchCard
                        match={result.semifinal}
                        teamA={buildTeam(entrants[0])}
                        teamB={buildTeam(entrants[1])}
                        label="Semifinal"
                      />
                      <MatchCard
                        match={result.final}
                        teamA={buildTeam(result.semifinal.winner)}
                        teamB={buildTeam(entrants[2])}
                        label="Final"
                      />
                      <p className="text-center text-sm text-charcoal-900 dark:text-sand font-semibold">Winner: {result.winner}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="sticky bottom-4 mt-6 flex justify-center">
          <SambaButton variant="primary" size="lg" disabled={!readyToDraw} onClick={goToDraw}>
            {teamCount === 48 && directPicksDone && !playoffDone
              ? 'Simulate Both Playoff Paths to Continue'
              : `Continue to Draw (${totalPicked + (teamCount === 48 ? playoffResults.filter(Boolean).length : 0)}/${totalNeeded + (teamCount === 48 ? 2 : 0)})`}
          </SambaButton>
        </div>
      </div>
    </AppBackground>
  )
}
