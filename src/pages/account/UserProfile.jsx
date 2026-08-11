import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'
import { fetchPublicProfile, fetchPublicPredictions, fetchPublicSpotlight } from '../../lib/storage'
import { predictionsLocked, PREDICTIONS_LOCK_AT } from '../../lib/predictionsLock'
import { LEAGUES } from '../../data/leagues'
import { getNation } from '../../data/nations'
import CountryFlag from '../../components/common/CountryFlag'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import PredictedTableView from '../../components/leagues/PredictedTableView'
import SpotlightCard from '../../components/account/SpotlightCard'

const UNLOCK_LABEL = PREDICTIONS_LOCK_AT.toLocaleString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
})

// One league's predicted table, collapsed to a header by default (mirrors
// LeagueCard's gradient chip) and expandable to the full PredictedTableView
// -- read-only, no edit affordance, since this is always someone else's
// profile (own profile redirects to /account instead, see below).
function LeagueTableSection({ league, order }) {
  const [open, setOpen] = useState(false)
  const nation = getNation(league.country)
  return (
    <div className="rounded-2xl shadow-depth-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-white"
        style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <CountryFlag nation={nation} size="sm" />
          <span className="font-display font-bold truncate">{league.name}</span>
        </span>
        <svg viewBox="0 0 24 24" className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="p-3 bg-white/60 dark:bg-night-card/60">
          <PredictedTableView league={league} order={order} />
        </div>
      )}
    </div>
  )
}

export default function UserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [profile, setProfile] = useState(undefined)
  const [predictions, setPredictions] = useState({})
  const [spotlight, setSpotlight] = useState([])
  const [loading, setLoading] = useState(true)

  // A user's own profile already has a richer view at /account -- send them
  // there instead of showing the stripped-down public version of themselves.
  useEffect(() => {
    if (user && userId === user.id) navigate('/account', { replace: true })
  }, [user, userId, navigate])

  useEffect(() => {
    if (!userId || (user && userId === user.id)) return
    let cancelled = false
    setLoading(true)
    Promise.all([fetchPublicProfile(userId), fetchPublicPredictions(userId), fetchPublicSpotlight(userId)]).then(([p, preds, spot]) => {
      if (cancelled) return
      setProfile(p)
      setPredictions(preds)
      setSpotlight(spot.map((row) => ({ ...row, runnerUp: row.runnerUp ?? row.runner_up })))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId, user])

  if (loading || profile === undefined) {
    return (
      <AppBackground>
        <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-16">{t('account.loading')}</p>
      </AppBackground>
    )
  }

  if (!profile) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('profile.notFound')}</p>
          <button onClick={() => navigate(-1)} className="text-emerald dark:text-mint font-semibold text-sm">{t('common.back')}</button>
        </div>
      </AppBackground>
    )
  }

  const nation = profile.favorite_team ? getNation(profile.favorite_team) : null
  const locked = !predictionsLocked()
  const leaguesWithPredictions = LEAGUES.filter((l) => predictions[l.key]?.order)

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <NavBar title={profile.name || t('compete.unnamedMember')} />

        <div className="rounded-2xl bg-white/90 dark:bg-night-card/90 shadow-depth-lg p-5 flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0 border border-charcoal-900/10 dark:border-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald text-white flex items-center justify-center font-display font-bold text-xl shrink-0">
              {(profile.name || '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-lg text-charcoal-900 dark:text-sand truncate">{profile.name || t('compete.unnamedMember')}</p>
            {nation && (
              <p className="text-sm text-charcoal-600 dark:text-charcoal-300 flex items-center gap-1.5 mt-0.5">
                <CountryFlag nation={nation} size="xs" /> {t('dashboard.supporting', { name: nation.name })}
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand mb-3">{t('profile.predictedTables')}</h2>
          {locked ? (
            <div className="rounded-xl border border-dashed border-charcoal-900/20 dark:border-white/20 p-5 text-center text-sm text-charcoal-600 dark:text-charcoal-300">
              {t('profile.locked', { date: UNLOCK_LABEL })}
            </div>
          ) : leaguesWithPredictions.length === 0 ? (
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('profile.noPredictions')}</p>
          ) : (
            <div className="space-y-2">
              {leaguesWithPredictions.map((league) => (
                <LeagueTableSection key={league.key} league={league} order={predictions[league.key].order} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand mb-3">{t('profile.spotlightedTournaments')}</h2>
          {spotlight.length === 0 ? (
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('profile.noSpotlight')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {spotlight.map((entry) => (
                <SpotlightCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppBackground>
  )
}
