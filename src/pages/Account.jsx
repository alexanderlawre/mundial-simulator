import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { fetchCloudLeaguePredictions, fetchCloudSimulationHistory } from '../lib/storage'
import { LEAGUES } from '../data/leagues'
import { getNation } from '../data/nations'
import CountryFlag from '../components/CountryFlag'
import AppBackground from '../components/AppBackground'
import NavBar from '../components/NavBar'
import SambaButton from '../components/SambaButton'
import { TopPicksPreview } from './LeaguesHub'
import { useTranslation } from '../lib/i18n'

const MODE_LABEL_KEYS = { historic: 'account.modeHistoric', custom: 'account.modeCustom', wc2026: 'account.modeWc2026' }
const SIMULATIONS_PREVIEW_N = 3

function SimRow({ entry }) {
  const { t, tn } = useTranslation()
  const winnerNation = entry.winner ? getNation(entry.winner) : null
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/70 dark:bg-night-card/70 border border-charcoal-900/10 dark:border-white/10">
      {winnerNation && <CountryFlag nation={winnerNation} size="sm" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-charcoal-900 dark:text-sand">{entry.winner ? tn(entry.winner) : '—'}</p>
        <p className="text-xs text-charcoal-600 dark:text-charcoal-300 truncate">
          {t(MODE_LABEL_KEYS[entry.mode] || 'account.modeCustom')}{entry.descriptor ? ` · ${entry.descriptor}` : ''}
        </p>
      </div>
      <span className="text-[11px] text-charcoal-600 dark:text-charcoal-300 shrink-0">
        {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
      </span>
    </div>
  )
}

export default function Account() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [predictions, setPredictions] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllSims, setShowAllSims] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([fetchCloudLeaguePredictions(user.id), fetchCloudSimulationHistory(user.id)]).then(([preds, sims]) => {
      if (cancelled) return
      setPredictions(preds)
      setHistory(sims)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user])

  async function handleSignOut() {
    if (!window.confirm(t('account.signOutConfirm'))) return
    await signOut()
    navigate('/')
  }

  const favoriteNation = user?.user_metadata?.favorite_team ? getNation(user.user_metadata.favorite_team) : null

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <NavBar title={t('account.title')} />

        <div className="rounded-2xl bg-white/90 dark:bg-night-card/90 shadow-depth-lg p-5 flex items-center gap-4">
          {favoriteNation && <CountryFlag nation={favoriteNation} size="lg" />}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-lg text-charcoal-900 dark:text-sand truncate">{user?.user_metadata?.name || '—'}</p>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300 truncate">{user?.email}</p>
          </div>
          <SambaButton variant="outline" size="sm" onClick={handleSignOut}>{t('account.signOut')}</SambaButton>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand mb-3">{t('account.submittedTables')}</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {LEAGUES.map((league) => {
              const prediction = predictions[league.key]
              return (
                <button
                  key={league.key}
                  onClick={() => navigate(`/leagues/${league.key}`)}
                  className="text-left rounded-xl overflow-hidden shadow-depth hover:-translate-y-0.5 transition-all"
                >
                  <div className="p-3 text-white" style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}>
                    <p className="font-display font-bold text-sm">{league.name}</p>
                    <p className="text-[11px] text-white/80 mt-0.5">
                      {prediction?.confirmed ? t('leagues.predictionsLocked') : prediction ? t('leagues.inProgress') : t('account.notStarted')}
                    </p>
                    <TopPicksPreview league={league} order={prediction?.order} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand mb-3">{t('account.pastSimulations')}</h2>
          {loading ? (
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('account.loading')}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('account.noSimulations')}</p>
          ) : (
            <div className="space-y-2">
              {(showAllSims ? history : history.slice(0, SIMULATIONS_PREVIEW_N)).map((entry) => (
                <SimRow key={entry.id} entry={entry} />
              ))}
              {history.length > SIMULATIONS_PREVIEW_N && (
                <button
                  type="button"
                  onClick={() => setShowAllSims((v) => !v)}
                  className="w-full text-xs font-semibold text-forest dark:text-mint py-2 rounded-xl border border-dashed border-charcoal-900/20 dark:border-white/20 hover:bg-white/50 dark:hover:bg-night-card/50 transition-colors flex items-center justify-center gap-1"
                >
                  {showAllSims ? t('account.showRecentOnly') : t('account.showAllSimulations', { count: history.length })}
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-3 h-3 transition-transform ${showAllSims ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand mb-3">{t('account.groups')}</h2>
          <div className="rounded-xl border border-dashed border-charcoal-900/20 dark:border-white/20 p-5 text-center text-sm text-charcoal-600 dark:text-charcoal-300">
            {t('account.groupsComingSoon')}
          </div>
        </div>
      </div>
    </AppBackground>
  )
}
