import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { nationsByConfederation, CONFEDERATIONS } from '../../data/nations'
import { getQuotas, totalFromQuotas, PLAYOFF_PATHS, PLAYOFF_TEAM_COUNTS } from '../../data/confederationQuotas'
import { getTournamentConfig, tournamentI18nPrefix } from '../../data/internationalTournaments'
import { getRating } from '../../data/ratings'
import { simulateFullQualifying, simulateQualifyingForConfederation } from '../../lib/qualifying'
import { buildTeam, simulateInterconfedPlayoff } from '../../lib/tournamentEngine'
import CountryFlag from '../../components/common/CountryFlag'
import SambaButton from '../../components/common/SambaButton'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import MatchCard from '../../components/worldcup/MatchCard'
import { useTranslation } from '../../lib/i18n'

// tournamentKey is only ever set when arriving from the new International
// Tournaments hub for one of the non-World-Cup competitions (Euro, Copa
// América, AFCON, Asian Cup, Gold Cup). When absent (the World Cup card, or
// any old bookmarked /simulator/setup link), every branch below behaves
// exactly as it did before this feature existed.
export default function SimulatorSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, tn } = useTranslation()
  const tournamentKey = location.state?.tournamentKey || null
  const tournamentConfig = tournamentKey ? getTournamentConfig(tournamentKey) : null
  const [teamCount, setTeamCount] = useState(null)
  const [picked, setPicked] = useState({}) // confederation -> [nation names]

  // Fixed-format tournaments skip the count picker entirely -- their team
  // count is implied by the config's quotas, never chosen by the user.
  const quotas = tournamentConfig ? tournamentConfig.quotas : teamCount ? getQuotas(teamCount) : null

  const pickedFlat = useMemo(
    () => Object.entries(picked).flatMap(([conf, names]) => names.map((n) => ({ name: n, confederation: conf }))),
    [picked]
  )

  // Intercontinental playoff (48- and 64-team World Cup formats only): 2
  // mini-knockouts decide the last 2 slots beyond the direct quota picks.
  // None of the fixed-format international tournaments have one.
  const hasPlayoff = !tournamentConfig && PLAYOFF_TEAM_COUNTS.includes(teamCount)
  const [playoffEntrants, setPlayoffEntrants] = useState(() => PLAYOFF_PATHS.map((p) => p.legs.map(() => null)))
  const [playoffResults, setPlayoffResults] = useState(() => PLAYOFF_PATHS.map(() => null))

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
    PLAYOFF_PATHS.forEach((path, pathIdx) => {
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
    setPlayoffResults(PLAYOFF_PATHS.map(() => null))
  }

  function simulatePlayoffPath(pathIdx) {
    const path = PLAYOFF_PATHS[pathIdx]
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
  const directPicksDone = (tournamentConfig || teamCount) && totalPicked === totalNeeded
  const playoffDone = hasPlayoff ? playoffResults.every((r) => r) : true
  const readyToDraw = directPicksDone && playoffDone

  function goToDraw() {
    const directNames = pickedFlat.map((t) => t.name)
    const playoffWinnerNames = hasPlayoff ? playoffResults.map((r) => r.winner) : []
    const effectiveTeamCount = tournamentConfig ? totalFromQuotas(quotas) : teamCount
    navigate('/simulator/draw', {
      state: { teamCount: effectiveTeamCount, teamNames: [...directNames, ...playoffWinnerNames], tournamentKey },
    })
  }

  if (!tournamentConfig && !teamCount) {
    return (
      <AppBackground>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="text-left mb-8">
            <NavBar />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest dark:text-mint mb-2">{t('play.customTitle')}</h1>
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-8">{t('play.customSubtitle')}</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[32, 48, 64].map((n) => (
              <button
                key={n}
                onClick={() => setTeamCount(n)}
                className="rounded-2xl bg-white dark:bg-night-card shadow-depth-lg p-8 hover:-translate-y-1 transition-all"
              >
                <p className="font-display text-4xl font-extrabold text-emerald">{n}</p>
                <p className="text-charcoal-600 dark:text-charcoal-300 mt-2">
                  {n === 32 ? t('play.formatClassic') : n === 48 ? t('play.format2026') : t('play.formatExpanded')}
                </p>
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
            <NavBar
              title={tournamentConfig ? t(`tournaments.${tournamentI18nPrefix(tournamentConfig.key)}Name`) : t('play.pickTeamsTitle', { count: teamCount })}
              subtitle={t('play.selectedCount', { picked: totalPicked, total: totalNeeded })}
            />
          </div>
          <div className="flex gap-2">
            <SambaButton
              variant="outline"
              size="sm"
              onClick={() => {
                if (tournamentConfig) { navigate('/tournaments'); return }
                setTeamCount(null)
                setPicked({})
              }}
            >
              {t('play.changeFormat')}
            </SambaButton>
            <SambaButton variant="gold" size="sm" onClick={simulateQualifyingAll}>
              {t('play.simulateAllQualifying')}
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
                    {t('play.simulateQualifying')}
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
                        <span className="truncate text-charcoal-900 dark:text-sand">{tn(n.name)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {hasPlayoff && directPicksDone && (
          <div className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-4 mt-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display font-semibold text-charcoal-900 dark:text-sand">{t('play.playoffTitle')}</h2>
                <p className="text-charcoal-600 dark:text-charcoal-300 text-sm">{t('play.playoffDesc')}</p>
              </div>
              <SambaButton variant="secondary" size="sm" onClick={autoFillPlayoffEntrants}>{t('play.autoFillEntrants')}</SambaButton>
            </div>
            {PLAYOFF_PATHS.map((path, pathIdx) => {
              const entrants = playoffEntrants[pathIdx]
              const result = playoffResults[pathIdx]
              const allPicked = entrants.every((n) => n)
              return (
                <div key={path.id} className="rounded-xl bg-sand/40 dark:bg-night/40 p-3 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-charcoal-600 dark:text-charcoal-300 font-semibold">
                    {t('play.playoffPathLabel', { number: pathIdx + 1, legA: path.legs[0], legB: path.legs[1], legC: path.legs[2] })}
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {path.legs.map((conf, legIdx) => {
                      const selectedName = entrants[legIdx]
                      const options = nationsByConfederation(conf)
                        .filter((n) => !playoffUsedNames.has(n.name) || selectedName === n.name)
                        .sort((a, b) => getRating(b.name, conf) - getRating(a.name, conf))
                      return (
                        <div key={legIdx}>
                          <p className="text-[11px] text-charcoal-600 dark:text-charcoal-300 mb-1">{conf}{legIdx === 2 ? ` ${t('play.byeSuffix')}` : ''}</p>
                          <select
                            className="w-full rounded-lg border border-charcoal-900/10 dark:border-white/10 px-2 py-1.5 text-sm bg-white dark:bg-night-card"
                            value={selectedName || ''}
                            onChange={(e) => setPlayoffEntrant(pathIdx, legIdx, e.target.value)}
                          >
                            <option value="">{t('play.choosePlayoffTeam', { conf })}</option>
                            {options.map((n) => (
                              <option key={n.name} value={n.name}>{tn(n.name)}</option>
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
                        {result ? t('play.resimulatePath') : t('play.simulatePlayoffPath')}
                      </SambaButton>
                    </div>
                  )}
                  {result && (
                    <div className="space-y-2">
                      <MatchCard
                        match={result.semifinal}
                        teamA={buildTeam(entrants[0])}
                        teamB={buildTeam(entrants[1])}
                        label={t('play.semifinal')}
                      />
                      <MatchCard
                        match={result.final}
                        teamA={buildTeam(result.semifinal.winner)}
                        teamB={buildTeam(entrants[2])}
                        label={t('rounds.Final')}
                      />
                      <p className="text-center text-sm text-charcoal-900 dark:text-sand font-semibold">{t('play.winnerPrefix')}{tn(result.winner)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="sticky bottom-4 mt-6 flex justify-center">
          <SambaButton variant="primary" size="lg" disabled={!readyToDraw} onClick={goToDraw}>
            {hasPlayoff && directPicksDone && !playoffDone
              ? t('play.simulateBothPlayoffPaths')
              : t('play.continueToDraw', { done: totalPicked + (hasPlayoff ? playoffResults.filter(Boolean).length : 0), total: totalNeeded + (hasPlayoff ? 2 : 0) })}
          </SambaButton>
        </div>
      </div>
    </AppBackground>
  )
}
