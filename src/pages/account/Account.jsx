import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { fetchCloudLeaguePredictions, fetchCloudSimulationHistory, getPinnedSimulationIds, setSimulationPinned, uploadUserAvatar, updateProfileAvatar, getProfile, saveProfile } from '../../lib/storage'
import { LEAGUES } from '../../data/leagues'
import { getNation } from '../../data/nations'
import CountryFlag from '../../components/common/CountryFlag'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import LeagueCard from '../../components/leagues/LeagueCard'
import SpotlightCard, { MODE_LABEL_KEYS, PinToggle } from '../../components/account/SpotlightCard'
import { useTranslation } from '../../lib/i18n'

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

export default function Account() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [predictions, setPredictions] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [simFilter, setSimFilter] = useState('recent')
  const [pinnedIds, setPinnedIds] = useState(() => getPinnedSimulationIds())
  const [avatarUrl, setAvatarUrl] = useState(() => getProfile()?.avatarUrl || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

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

  // Instant local preview via createObjectURL (mirrors the group-avatar
  // upload flow in CreateGroupModal.jsx), then upload to the public
  // `user-avatars` bucket and persist the resulting URL on the profile row.
  // Also mirrors it into the local profile cache immediately so
  // ProfileButton/Dashboard pick up the change without a reload.
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setAvatarUrl(URL.createObjectURL(file))
    setUploadingAvatar(true)
    const result = await uploadUserAvatar(user.id, file)
    if (!result.ok) {
      setUploadingAvatar(false)
      window.alert(result.error)
      return
    }
    await updateProfileAvatar(user.id, result.url)
    setUploadingAvatar(false)
    setAvatarUrl(result.url)
    saveProfile({ ...(getProfile() || {}), avatarUrl: result.url })
  }

  const favoriteNation = user?.user_metadata?.favorite_team ? getNation(user.user_metadata.favorite_team) : null
  const initial = (user?.user_metadata?.name || user?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <NavBar title={t('account.title')} />

        <div className="rounded-2xl bg-white/90 dark:bg-night-card/90 shadow-depth-lg p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-charcoal-900/10 dark:border-white/10" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-emerald text-white flex items-center justify-center font-display font-bold text-xl">
                {initial}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label={t('profile.changePhoto')}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold text-charcoal-900 shadow-depth flex items-center justify-center hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-lg text-charcoal-900 dark:text-sand truncate">{user?.user_metadata?.name || '—'}</p>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300 truncate">{user?.email}</p>
          </div>
          {favoriteNation && <CountryFlag nation={favoriteNation} size="lg" className="shrink-0" />}
          <SambaButton variant="outline" size="sm" onClick={handleSignOut}>{t('account.signOut')}</SambaButton>
        </div>
        {uploadingAvatar && <p className="-mt-3 text-xs text-charcoal-600 dark:text-charcoal-300">{t('profile.uploadingPhoto')}</p>}

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
          <div className="flex flex-col gap-2">
            {LEAGUES.map((league) => (
              <LeagueCard
                key={league.key}
                league={league}
                prediction={predictions[league.key]}
                onClick={() => navigate(`/leagues/${league.key}`)}
                compact
              />
            ))}
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
