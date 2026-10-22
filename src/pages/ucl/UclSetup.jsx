import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import CountryFlag from '../../components/common/CountryFlag'
import ClubBadge from '../../components/leagues/ClubBadge'
import { ClubCountryFlag } from '../../components/ucl/ClubLabel'
import { getNation } from '../../data/nations'
import {
  UCL_FIELD_SIZE,
  UCL_MAX_FIVE_SPOT_LEAGUES,
  UCL_REST_OF_EUROPE_CLUBS,
  UCL_REST_OF_EUROPE_COUNTRIES,
  UCL_TOP5,
  uclClubByKey,
  uclClubsByCountry,
} from '../../data/uclClubs'
import { simulateQualifyingPlayoff, sortByCoefficient, weightedPick } from '../../lib/uclEngine'
import { useTranslation } from '../../lib/i18n'

// Rest-of-Europe cap per association: keeps the draw solvable under UEFA's
// "no more than two opponents from one association" rule and mirrors how few
// clubs a smaller association can realistically send.
const REST_PER_COUNTRY_LIMIT = 3
const PAGE_SIZE = 90

const LEAGUE_COLORS = {
  England: { from: '#3D195B', to: '#E90052' },
  Spain: { from: '#EE2523', to: '#EE8707' },
  Germany: { from: '#B10F1B', to: '#2A2A2A' },
  Italy: { from: '#008C45', to: '#008FD7' },
  France: { from: '#091C3E', to: '#2563EB' },
}

const LEAGUE_POOLS = Object.fromEntries(UCL_TOP5.map(({ country }) => [country, sortByCoefficient(uclClubsByCountry(country))]))
const REST_SORTED = sortByCoefficient(UCL_REST_OF_EUROPE_CLUBS)

function ClubChip({ club, selected, disabled, onClick, title }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm transition-all min-w-0
        ${selected ? 'bg-mint dark:bg-emerald/30 ring-2 ring-emerald' : 'hover:bg-sand dark:hover:bg-night'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <ClubBadge club={club} size="xs" lazy />
      <span className="truncate text-charcoal-900 dark:text-sand">{club.name}</span>
    </button>
  )
}

export default function UclSetup() {
  const navigate = useNavigate()
  const { t, tn } = useTranslation()

  const [slots, setSlots] = useState(() => Object.fromEntries(UCL_TOP5.map((x) => [x.country, x.defaultSlots])))
  const [picked, setPicked] = useState(() => Object.fromEntries(UCL_TOP5.map((x) => [x.country, []])))
  const [restPicked, setRestPicked] = useState([])
  const [qualifying, setQualifying] = useState(null)
  const [query, setQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const fiveCount = UCL_TOP5.filter((x) => slots[x.country] === 5).length
  const leagueSpots = UCL_TOP5.reduce((s, x) => s + slots[x.country], 0)
  const restSpots = UCL_FIELD_SIZE - leagueSpots
  const leaguePicked = UCL_TOP5.reduce((s, x) => s + picked[x.country].length, 0)
  const totalPicked = leaguePicked + restPicked.length
  const ready = totalPicked === UCL_FIELD_SIZE

  const restCountryCounts = useMemo(() => {
    const counts = {}
    restPicked.forEach((k) => {
      const c = uclClubByKey[k].country
      counts[c] = (counts[c] || 0) + 1
    })
    return counts
  }, [restPicked])

  const restCountries = useMemo(
    () => [...UCL_REST_OF_EUROPE_COUNTRIES].sort((a, b) => tn(a).localeCompare(tn(b))),
    [tn]
  )

  const restList = useMemo(() => {
    const q = query.trim().toLowerCase()
    return REST_SORTED.filter((c) => (!countryFilter || c.country === countryFilter) && (!q || c.name.toLowerCase().includes(q)))
  }, [query, countryFilter])

  function setLeagueSlots(country, n) {
    if (n === slots[country]) return
    if (n === 5 && fiveCount >= UCL_MAX_FIVE_SPOT_LEAGUES) return
    const nextSlots = { ...slots, [country]: n }
    const nextRest = UCL_FIELD_SIZE - UCL_TOP5.reduce((s, x) => s + nextSlots[x.country], 0)
    setSlots(nextSlots)
    setPicked((prev) => ({ ...prev, [country]: prev[country].slice(0, n) }))
    if (restPicked.length > nextRest) {
      setRestPicked((prev) => prev.slice(0, nextRest))
    }
    setQualifying(null)
  }

  function toggleLeagueClub(country, key) {
    setPicked((prev) => {
      const cur = prev[country]
      if (cur.includes(key)) return { ...prev, [country]: cur.filter((k) => k !== key) }
      if (cur.length >= slots[country]) return prev
      return { ...prev, [country]: [...cur, key] }
    })
  }

  function simulateLeagueQualifying(country) {
    const have = picked[country]
    const need = slots[country] - have.length
    if (need <= 0) return
    const pool = LEAGUE_POOLS[country].filter((c) => !have.includes(c.key))
    const extra = weightedPick(pool, need, { temperature: 5 }).map((c) => c.key)
    setPicked((prev) => ({ ...prev, [country]: [...have, ...extra] }))
  }

  function toggleRestClub(key) {
    setQualifying(null)
    setRestPicked((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= restSpots) return prev
      const country = uclClubByKey[key].country
      if ((restCountryCounts[country] || 0) >= REST_PER_COUNTRY_LIMIT) return prev
      return [...prev, key]
    })
  }

  function autoFillRest() {
    const need = restSpots - restPicked.length
    if (need <= 0) return
    const have = restPicked.map((k) => uclClubByKey[k])
    const pool = REST_SORTED.filter((c) => !restPicked.includes(c.key))
    const extra = weightedPick(pool, need, { temperature: 7, perCountryLimit: REST_PER_COUNTRY_LIMIT, existing: have })
    setQualifying(null)
    setRestPicked([...restPicked, ...extra.map((c) => c.key)])
  }

  function runQualifyingPlayoff() {
    const have = restPicked.map((k) => uclClubByKey[k])
    const { entrants, ties } = simulateQualifyingPlayoff(REST_SORTED, restSpots, {
      lockedIn: have,
      perCountryLimit: REST_PER_COUNTRY_LIMIT,
    })
    setRestPicked(entrants.map((c) => c.key))
    setQualifying(ties.length ? ties : null)
  }

  function simulateEverything() {
    const nextPicked = {}
    UCL_TOP5.forEach(({ country }) => {
      const have = picked[country]
      const need = slots[country] - have.length
      const pool = LEAGUE_POOLS[country].filter((c) => !have.includes(c.key))
      nextPicked[country] = [...have, ...weightedPick(pool, need, { temperature: 5 }).map((c) => c.key)]
    })
    setPicked(nextPicked)
    runQualifyingPlayoff()
  }

  function resetAll() {
    setPicked(Object.fromEntries(UCL_TOP5.map((x) => [x.country, []])))
    setRestPicked([])
    setQualifying(null)
  }

  function goToDraw() {
    const clubKeys = [...UCL_TOP5.flatMap((x) => picked[x.country]), ...restPicked]
    navigate('/ucl/draw', { state: { clubKeys } })
  }

  const card = 'rounded-2xl bg-white dark:bg-night-card shadow-depth overflow-hidden'

  return (
    <AppBackground>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-3">
          <NavBar title={t('ucl.name')} subtitle={t('ucl.setupSubtitle', { picked: totalPicked, total: UCL_FIELD_SIZE })} />
          <div className="flex flex-wrap gap-2">
            <SambaButton variant="gold" size="sm" onClick={simulateEverything}>{t('play.simulateAllQualifying')}</SambaButton>
            <SambaButton variant="outline" size="sm" onClick={resetAll}>{t('ucl.reset')}</SambaButton>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${card} p-4`}>
            <h2 className="font-display font-semibold text-charcoal-900 dark:text-sand">{t('ucl.slotsTitle')}</h2>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300 mt-1">{t('ucl.slotsHelp')}</p>
            <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-2 tabular-nums">
              {t('ucl.slotsSummary', { league: leagueSpots, rest: restSpots, total: UCL_FIELD_SIZE })}
            </p>
          </div>

          {UCL_TOP5.map(({ country }) => {
            const pool = LEAGUE_POOLS[country]
            const have = picked[country]
            const n = slots[country]
            const nation = getNation(country)
            const colors = LEAGUE_COLORS[country]
            const fiveLocked = fiveCount >= UCL_MAX_FIVE_SPOT_LEAGUES && n !== 5
            return (
              <div key={country} className={card}>
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }} />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {nation && <CountryFlag nation={nation} size="sm" />}
                      <h3 className="font-display font-semibold text-charcoal-900 dark:text-sand truncate">{tn(country)}</h3>
                      <span className="text-sm text-charcoal-600 dark:text-charcoal-300 tabular-nums">({have.length}/{n})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex rounded-xl overflow-hidden border border-charcoal-900/15 dark:border-white/15" role="group" aria-label={t('ucl.spotsLabel', { count: n })}>
                        {[4, 5].map((opt) => {
                          const disabled = opt === 5 && fiveLocked
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={disabled}
                              title={disabled ? t('ucl.slotsFiveLocked') : undefined}
                              onClick={() => setLeagueSlots(country, opt)}
                              className={`px-3.5 py-1.5 text-sm font-display font-semibold transition-colors ${
                                n === opt ? 'bg-emerald text-white' : 'bg-white dark:bg-night-card text-charcoal-900 dark:text-sand hover:bg-sand dark:hover:bg-night'
                              } ${disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                      <SambaButton variant="secondary" size="sm" onClick={() => simulateLeagueQualifying(country)}>
                        {t('play.simulateQualifying')}
                      </SambaButton>
                    </div>
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-charcoal-600 dark:text-charcoal-300 mb-2">{t('ucl.automaticQualification')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                    {pool.map((club) => {
                      const isSelected = have.includes(club.key)
                      return (
                        <ClubChip
                          key={club.key}
                          club={club}
                          selected={isSelected}
                          disabled={!isSelected && have.length >= n}
                          onClick={() => toggleLeagueClub(country, club.key)}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}

          <div className={card}>
            <div className="h-1.5 bg-gradient-to-r from-[#0A1428] to-[#16A5E3]" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-charcoal-900 dark:text-sand">
                    {t('ucl.restOfEurope')}{' '}
                    <span className="text-sm text-charcoal-600 dark:text-charcoal-300 tabular-nums">({restPicked.length}/{restSpots})</span>
                  </h3>
                  <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('ucl.restOfEuropeDesc', { count: restSpots })}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <SambaButton variant="secondary" size="sm" onClick={autoFillRest}>{t('ucl.autoFill')}</SambaButton>
                  <SambaButton variant="gold" size="sm" onClick={runQualifyingPlayoff}>{t('ucl.simulatePlayoffRound')}</SambaButton>
                </div>
              </div>

              {qualifying && (
                <div className="rounded-xl bg-sand/50 dark:bg-night/50 p-3 animate-slide-up">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 mb-2">{t('ucl.playoffResultsTitle')}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {qualifying.map(({ seeded, unseeded, result }) => {
                      const winnerKey = result.winner
                      return (
                        <div key={seeded.key + unseeded.key} className="flex items-center gap-2 rounded-lg bg-white dark:bg-night-card px-2 py-1.5 text-xs">
                          <ClubBadge club={unseeded} size="xs" lazy />
                          <span className={`truncate flex-1 ${winnerKey === unseeded.key ? 'font-bold' : 'opacity-60'} text-charcoal-900 dark:text-sand`}>{unseeded.name}</span>
                          <span className="tabular-nums font-bold text-charcoal-900 dark:text-sand shrink-0">
                            {result.aggA}&ndash;{result.aggB}
                            {result.pens ? <span className="text-gold font-semibold"> ({result.pens.penA}-{result.pens.penB})</span> : null}
                          </span>
                          <span className={`truncate flex-1 text-right ${winnerKey === seeded.key ? 'font-bold' : 'opacity-60'} text-charcoal-900 dark:text-sand`}>{seeded.name}</span>
                          <ClubBadge club={seeded} size="xs" lazy />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setVisible(PAGE_SIZE)
                  }}
                  placeholder={t('ucl.searchClubs')}
                  className="flex-1 min-w-[10rem] rounded-xl border border-charcoal-900/10 dark:border-white/10 px-3 py-2 text-sm bg-white dark:bg-night-card text-charcoal-900 dark:text-sand"
                />
                <select
                  value={countryFilter}
                  onChange={(e) => {
                    setCountryFilter(e.target.value)
                    setVisible(PAGE_SIZE)
                  }}
                  className="rounded-xl border border-charcoal-900/10 dark:border-white/10 px-3 py-2 text-sm bg-white dark:bg-night-card text-charcoal-900 dark:text-sand max-w-full"
                >
                  <option value="">{t('ucl.allCountries')}</option>
                  {restCountries.map((c) => (
                    <option key={c} value={c}>{tn(c)}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-300">{t('ucl.countryLimit', { count: REST_PER_COUNTRY_LIMIT })}</p>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto p-1">
                {restList.slice(0, visible).map((club) => {
                  const isSelected = restPicked.includes(club.key)
                  const countryFull = !isSelected && (restCountryCounts[club.country] || 0) >= REST_PER_COUNTRY_LIMIT
                  const disabled = !isSelected && (restPicked.length >= restSpots || countryFull)
                  return (
                    <div key={club.key} className="relative">
                      <ClubChip
                        club={club}
                        selected={isSelected}
                        disabled={disabled}
                        title={`${tn(club.country)} · #${club.uefaRank}`}
                        onClick={() => toggleRestClub(club.key)}
                      />
                      <ClubCountryFlag club={club} size="xs" className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )
                })}
                {restList.length === 0 && <p className="col-span-full text-sm text-charcoal-600 dark:text-charcoal-300 p-2">{t('onboarding.noMatch')}</p>}
              </div>
              {restList.length > visible && (
                <div className="flex justify-center">
                  <SambaButton variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    {t('ucl.showMore', { count: restList.length - visible })}
                  </SambaButton>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 mt-6 flex justify-center">
          <SambaButton variant="primary" size="lg" disabled={!ready} onClick={goToDraw}>
            {t('ucl.continueToDraw', { done: totalPicked, total: UCL_FIELD_SIZE })}
          </SambaButton>
        </div>
      </div>
    </AppBackground>
  )
}
