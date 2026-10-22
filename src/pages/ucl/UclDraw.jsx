import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import ClubBadge from '../../components/leagues/ClubBadge'
import { ClubCountryFlag } from '../../components/ucl/ClubLabel'
import { UCL_FIELD_SIZE, uclClubByKey } from '../../data/uclClubs'
import { drawLeaguePhase } from '../../lib/uclEngine'
import { useTranslation } from '../../lib/i18n'

export default function UclDraw() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const clubKeys = location.state?.clubKeys
  const valid = Array.isArray(clubKeys) && clubKeys.length === UCL_FIELD_SIZE && clubKeys.every((k) => uclClubByKey[k])
  const clubs = useMemo(() => (valid ? clubKeys.map((k) => uclClubByKey[k]) : []), [valid, clubKeys])
  const clubByKey = useMemo(() => Object.fromEntries(clubs.map((c) => [c.key, c])), [clubs])

  const [draw, setDraw] = useState(null)
  const [drawId, setDrawId] = useState(0)
  const [drawing, setDrawing] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!valid) return undefined
    setDrawing(true)
    const timer = setTimeout(() => {
      const next = drawLeaguePhase(clubs)
      setDraw(next)
      setSelected((cur) => cur || next.pots[0][0].key)
      setDrawing(false)
    }, 700)
    return () => clearTimeout(timer)
  }, [valid, clubs, drawId])

  if (!valid) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('play.noTeamSelection')}</p>
          <SambaButton onClick={() => navigate('/ucl/setup')}>{t('play.backToSetup')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const potOf = {}
  draw?.pots.forEach((pot, i) => pot.forEach((c) => (potOf[c.key] = i)))

  function lockIn() {
    navigate('/ucl/play', {
      state: { clubKeys, fixtures: draw.fixtures, pots: draw.pots.map((p) => p.map((c) => c.key)) },
    })
  }

  const rowsForSelected = (() => {
    if (!draw || !selected) return []
    return [0, 1, 2, 3].map((p) => ({
      pot: p,
      home: draw.fixtures.find((f) => f.home === selected && potOf[f.away] === p),
      away: draw.fixtures.find((f) => f.away === selected && potOf[f.home] === p),
    }))
  })()
  const selectedClub = selected ? clubByKey[selected] : null

  return (
    <AppBackground>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex-1 min-w-[15rem]">
            <NavBar title={t('ucl.drawTitle')} subtitle={t('ucl.drawSubtitle')} />
          </div>
          <div className="flex gap-2">
            <SambaButton variant="outline" size="sm" disabled={drawing} onClick={() => setDrawId((n) => n + 1)}>{t('ucl.redraw')}</SambaButton>
            <SambaButton variant="primary" size="sm" disabled={drawing || !draw} onClick={lockIn}>{t('ucl.lockIn')}</SambaButton>
          </div>
        </div>

        <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mb-4">{t('ucl.drawRules')}</p>

        {drawing || !draw ? (
          <div className="rounded-2xl bg-white/80 dark:bg-night-card/80 shadow-depth py-16 text-center">
            <p className="font-display font-semibold text-lg text-forest dark:text-mint animate-kickoff-pulse">{t('ucl.drawing')}</p>
          </div>
        ) : (
          <div key={drawId} className="grid lg:grid-cols-[1fr_22rem] gap-5 items-start animate-slide-up">
            <div className="grid sm:grid-cols-2 gap-4">
              {draw.pots.map((pot, p) => (
                <div key={p} className="rounded-2xl bg-white/80 dark:bg-night-card/80 shadow-depth p-3">
                  <p className="font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('ucl.pot', { number: p + 1 })}</p>
                  <div className="space-y-1">
                    {pot.map((club) => (
                      <button
                        key={club.key}
                        type="button"
                        onClick={() => setSelected(club.key)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                          selected === club.key ? 'bg-mint dark:bg-emerald/30 ring-2 ring-emerald' : 'hover:bg-sand dark:hover:bg-night'
                        }`}
                      >
                        <ClubBadge club={club} size="xs" />
                        <span className="flex-1 truncate text-sm font-medium text-charcoal-900 dark:text-sand">{club.name}</span>
                        <ClubCountryFlag club={club} size="xs" />
                        <span className="text-[10px] tabular-nums text-charcoal-600 dark:text-charcoal-300 w-8 text-right">#{club.uefaRank}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-4 lg:sticky lg:top-24">
              {selectedClub ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <ClubBadge club={selectedClub} size="md" />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-charcoal-900 dark:text-sand truncate">{t('ucl.fixturesFor', { club: selectedClub.name })}</p>
                      <p className="text-xs text-charcoal-600 dark:text-charcoal-300">{t('ucl.pot', { number: potOf[selectedClub.key] + 1 })}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {rowsForSelected.map(({ pot, home, away }) => (
                      <div key={pot}>
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 mb-1">{t('ucl.pot', { number: pot + 1 })}</p>
                        {[
                          { f: home, label: t('ucl.home'), opp: home?.away },
                          { f: away, label: t('ucl.away'), opp: away?.home },
                        ].map(({ f, label, opp }) =>
                          f ? (
                            <div key={f.id} className="flex items-center gap-2 py-0.5">
                              <span className="w-12 text-[10px] font-semibold uppercase rounded bg-charcoal-900/5 dark:bg-white/10 text-center py-0.5 text-charcoal-600 dark:text-charcoal-300">{label}</span>
                              <ClubBadge club={clubByKey[opp]} size="xs" />
                              <span className="truncate text-sm text-charcoal-900 dark:text-sand">{clubByKey[opp].name}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('ucl.selectClubHint')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppBackground>
  )
}
