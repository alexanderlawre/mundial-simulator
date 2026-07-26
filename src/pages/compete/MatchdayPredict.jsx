import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import { fixturesSource } from '../../lib/fixturesSource'
import { getLeague, clubsByKey } from '../../data/leagues'
import { syncMatchdayPrediction, fetchMatchdayPredictions } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'

// Matchday prediction UI shell. Predictions open 1 day before the first
// kickoff of the matchday, and each fixture locks *individually* at its
// own kickoff rather than one shared deadline -- both computed here from
// each fixture's real `kickoffTs`, so the open/lock *logic* is correct
// and testable even though `fixturesSource` currently returns no
// fixtures (stubbed until a live data source is wired -- see
// src/lib/fixturesSource.js). Once real fixtures start flowing through
// that interface, this page needs no changes to start working.
function computeWindowOpensAt(fixtures) {
  if (!fixtures || fixtures.length === 0) return null
  const firstKickoff = Math.min(...fixtures.map((f) => new Date(f.kickoffTs).getTime()))
  return firstKickoff - 24 * 60 * 60 * 1000
}

function isFixtureLocked(fixture) {
  return Date.now() >= new Date(fixture.kickoffTs).getTime()
}

const OUTCOMES = ['H', 'D', 'A']

export default function MatchdayPredict() {
  const { groupId, leagueKey } = useParams()
  const { user } = useAuth()
  const { t } = useTranslation()
  const league = getLeague(leagueKey)
  const clubs = clubsByKey(leagueKey)
  const [matchday, setMatchday] = useState(1)
  const [fixtures, setFixtures] = useState([])
  const [predictions, setPredictions] = useState({})
  const [jokerFixtureId, setJokerFixtureId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fixturesSource.getFixturesForMatchday(leagueKey, matchday).then(async (data) => {
      if (cancelled) return
      setFixtures(data)
      if (user?.id && data.length > 0) {
        const existing = await fetchMatchdayPredictions(user.id, groupId, data.map((f) => f.id))
        if (!cancelled) {
          setPredictions(existing)
          const jokerEntry = Object.entries(existing).find(([, p]) => p.isJoker)
          if (jokerEntry) setJokerFixtureId(jokerEntry[0])
        }
      }
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [leagueKey, matchday, groupId, user?.id])

  if (!league) return null

  const opensAt = computeWindowOpensAt(fixtures)
  const isOpen = opensAt != null && Date.now() >= opensAt

  function setPrediction(fixtureId, patch) {
    setPredictions((prev) => ({ ...prev, [fixtureId]: { ...prev[fixtureId], ...patch } }))
  }

  async function handleSave(fixture) {
    const p = predictions[fixture.id]
    if (!p?.outcome) return
    await syncMatchdayPrediction(user?.id, groupId, fixture.id, {
      outcome: p.outcome,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      isJoker: jokerFixtureId === fixture.id,
    })
  }

  function handleToggleJoker(fixtureId) {
    setJokerFixtureId((prev) => (prev === fixtureId ? null : fixtureId))
  }

  return (
    <AppBackground>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('compete.matchdayTitle')} subtitle={`${league.name} \u00b7 ${t('play.grp', { letter: matchday })}`} />
        </div>

        {loading ? (
          <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-12">{t('account.loading')}</p>
        ) : fixtures.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth-lg p-8 text-center space-y-2">
            <p className="font-display font-bold text-charcoal-900 dark:text-sand">{t('compete.noFixturesTitle')}</p>
            <p className="text-charcoal-600 dark:text-charcoal-300 text-sm max-w-sm mx-auto">{t('compete.noFixturesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {!isOpen && (
              <p className="text-xs text-charcoal-600 dark:text-charcoal-300 text-center">{t('compete.matchdayNotOpenYet')}</p>
            )}
            {fixtures.map((fixture) => {
              const locked = isFixtureLocked(fixture)
              const home = clubs[fixture.homeClubKey]
              const away = clubs[fixture.awayClubKey]
              const p = predictions[fixture.id] || {}
              const disabled = locked || !isOpen
              return (
                <div
                  key={fixture.id}
                  className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-charcoal-900 dark:text-sand truncate">
                      {home?.name} {t('play.vs')} {away?.name}
                    </span>
                    {locked && (
                      <span className="text-[10px] uppercase tracking-wide text-charcoal-600 dark:text-charcoal-300 shrink-0">
                        {t('compete.locked')}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {OUTCOMES.map((o) => (
                      <button
                        key={o}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPrediction(fixture.id, { outcome: o })}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 ${
                          p.outcome === o
                            ? 'text-white border-transparent'
                            : 'bg-sand dark:bg-night text-charcoal-900 dark:text-sand border-charcoal-900/10 dark:border-white/10'
                        }`}
                        style={p.outcome === o ? { backgroundColor: league.colors.accent } : undefined}
                      >
                        {o === 'H' ? home?.name : o === 'A' ? away?.name : t('compete.draw')}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      disabled={disabled}
                      value={p.homeScore ?? ''}
                      onChange={(e) => setPrediction(fixture.id, { homeScore: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-16 px-2 py-1.5 rounded-lg border border-charcoal-900/15 dark:border-white/15 bg-sand dark:bg-night text-center text-sm text-charcoal-900 dark:text-sand outline-none focus:ring-2 focus:ring-emerald disabled:opacity-40"
                    />
                    <span className="text-charcoal-600 dark:text-charcoal-300 text-sm">-</span>
                    <input
                      type="number"
                      min="0"
                      disabled={disabled}
                      value={p.awayScore ?? ''}
                      onChange={(e) => setPrediction(fixture.id, { awayScore: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-16 px-2 py-1.5 rounded-lg border border-charcoal-900/15 dark:border-white/15 bg-sand dark:bg-night text-center text-sm text-charcoal-900 dark:text-sand outline-none focus:ring-2 focus:ring-emerald disabled:opacity-40"
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleToggleJoker(fixture.id)}
                      className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-40 ${
                        jokerFixtureId === fixture.id
                          ? 'bg-gold text-charcoal-900 border-transparent'
                          : 'bg-sand dark:bg-night text-charcoal-900 dark:text-sand border-charcoal-900/10 dark:border-white/10'
                      }`}
                    >
                      {t('compete.jokerLabel')}
                    </button>
                    <SambaButton size="sm" variant="outline" disabled={disabled || !p.outcome} onClick={() => handleSave(fixture)}>
                      {t('compete.saveChanges')}
                    </SambaButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppBackground>
  )
}
