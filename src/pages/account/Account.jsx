import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { fetchCloudLeaguePredictions, fetchCloudSimulationHistory, getPinnedSimulationIds, setSimulationPinned } from '../../lib/storage'
import { LEAGUES } from '../../data/leagues'
import { getNation } from '../../data/nations'
import CountryFlag from '../../components/common/CountryFlag'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import { TopPicksPreview } from '../leagues/LeaguesHub'
import { useTranslation } from '../../lib/i18n'

const MODE_LABEL_KEYS = { historic: 'account.modeHistoric', custom: 'account.modeCustom', wc2026: 'account.modeWc2026' }
const SIMULATIONS_PREVIEW_N = 3

// Themed dropdown for filtering the simulations list -- mirrors the
// popover pattern already established by LanguageSelector (button toggles
// an absolutely-positioned menu with a click-outside overlay) rather than
// a native <select>, for visual consistency with the rest of the app.
function SimFilterDropdown({ value, onChange, total }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const OPTIONS = [
    { key: 'recent', label: t('account.simFilterRecent') },
    { key: 'last10', label: t('account.simFilterLast10') },
    { key: 'all', label: t('account.simFilterAll', { count: total }) },
  ]
  const current = OPTIONS.find((o) => o.key === value) || OPTIONS[0]

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-forest dark:text-mint px-3 py-1.5 rounded-full border border-charcoal-900/15 dark:border-white/15 bg-white/70 dark:bg-night-card/70 hover:bg-white dark:hover:bg-night-card transition-colors"
      >
        {current.label}
        <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-36 rounded-xl bg-white dark:bg-night-card shadow-depth-lg border border-charcoal-900/10 dark:border-white/10 overflow-hidden py-1">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => { onChange(o.key); setOpen(false) }}
                className={`w-full flex items-center px-3 py-2 text-sm text-left hover:bg-sand dark:hover:bg-night transition-colors
                  ${o.key === value ? 'font-semibold text-forest dark:text-mint' : 'text-charcoal-900 dark:text-sand'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PinToggle({ pinned, onToggle }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={pinned ? t('account.unpin') : t('play.pinResult')}
      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${
        pinned ? 'text-gold' : 'text-charcoal-600/50 dark:text-charcoal-300/50 hover:text-charcoal-600 dark:hover:text-charcoal-300'
      }`}
    >
      {pinned ? '\u2605' : '\u2606'}
    </button>
  )
}

function SimRow({ entry, pinned, onTogglePin }) {
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
      {onTogglePin && <PinToggle pinned={pinned} onToggle={onTogglePin} />}
    </div>
  )
}

function SpotlightPodiumRow({ rank, label, name }) {
  const { tn } = useTranslation()
  if (!name) return null
  const nation = getNation(name)
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${rank === 1 ? 'bg-gold/15 border border-gold' : 'bg-white/70 dark:bg-night-card/70 border border-charcoal-900/10 dark:border-white/10'}`}>
      <span className="font-display text-xs font-bold text-charcoal-600 dark:text-charcoal-300 w-6 text-center shrink-0">{rank}</span>
      {nation && <CountryFlag nation={nation} size="sm" />}
      <span className="text-sm font-semibold flex-1 min-w-0 truncate text-left">{tn(name)}</span>
      <span className="text-xs text-charcoal-600 dark:text-charcoal-300 shrink-0">{label}</span>
    </div>
  )
}

function SpotlightCard({ entry, onUnpin }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold-light via-white dark:via-night-card to-gold-light/40 border-2 border-gold shadow-depth-gold p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide font-bold text-charcoal-900/70">
          {t(MODE_LABEL_KEYS[entry.mode] || 'account.modeCustom')}{entry.descriptor ? ` · ${entry.descriptor}` : ''}
        </p>
        <PinToggle pinned onToggle={onUnpin} />
      </div>
      <div className="space-y-1.5">
        <SpotlightPodiumRow rank={1} label={t('summary.winner')} name={entry.winner} />
        <SpotlightPodiumRow rank={2} label={t('summary.runnerUp')} name={entry.runnerUp} />
      </div>
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
  const [simFilter, setSimFilter] = useState('recent')
  const [pinnedIds, setPinnedIds] = useState(() => getPinnedSimulationIds())

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([fetchCloudLeaguePredictions(user.id), fetchCloudSimulationHistory(user.id)]).then(([preds, sims]) => {
      if (cancelled) return
      setPredictions(preds)
      // Cloud rows come back with Supabase's snake_case column names --
      // normalize to the same camelCase shape used by the local (guest)
      // history mirror so SimRow/SpotlightCard can treat both uniformly.
      setHistory(sims.map((row) => ({ ...row, runnerUp: row.runnerUp ?? row.runner_up })))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user])

  function togglePin(id) {
    const next = !pinnedIds.includes(id)
    setSimulationPinned(id, next)
    setPinnedIds((prev) => (next ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const spotlighted = history.filter((entry) => pinnedIds.includes(entry.id))

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

        {spotlighted.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand mb-3">{t('account.spotlight')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {spotlighted.map((entry) => (
                <SpotlightCard key={entry.id} entry={entry} onUnpin={() => togglePin(entry.id)} />
              ))}
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-charcoal-900 dark:text-sand">{t('account.pastSimulations')}</h2>
            {!loading && history.length > SIMULATIONS_PREVIEW_N && (
              <SimFilterDropdown value={simFilter} onChange={setSimFilter} total={history.length} />
            )}
          </div>
          {loading ? (
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('account.loading')}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('account.noSimulations')}</p>
          ) : (
            <div className="space-y-2">
              {(simFilter === 'all' ? history : history.slice(0, simFilter === 'last10' ? 10 : SIMULATIONS_PREVIEW_N)).map((entry) => (
                <SimRow key={entry.id} entry={entry} pinned={pinnedIds.includes(entry.id)} onTogglePin={() => togglePin(entry.id)} />
              ))}
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
