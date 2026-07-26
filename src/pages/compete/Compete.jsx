import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'
import { fetchUserGroups } from '../../lib/storage'
import CreateGroupModal from './CreateGroupModal'
import JoinGroupModal from './JoinGroupModal'

// Groups landing page (formerly a "coming soon" placeholder). Logged-out
// users get the existing sign-up prompt. Logged-in users see their group
// list (if any) plus dashed-border Create/Join cards -- per the spec,
// those two entry points always stay visible even once a user already has
// groups, not just on a first-run empty state.
export default function Compete() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchUserGroups(user.id).then((data) => {
      if (!cancelled) {
        setGroups(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [user])

  function handleCreated(group) {
    setShowCreate(false)
    // Add it to the dashboard list immediately rather than waiting on a
    // re-fetch next time this page mounts -- guarantees the new group shows
    // up on the main landing page even if the user comes straight back here.
    setGroups((prev) => [{ ...group, member_count: 1 }, ...prev])
    navigate(`/compete/group/${group.id}`)
  }

  function handleJoined(group) {
    setShowJoin(false)
    // joinGroupByCode() returns the group row as it was *before* the join
    // (fetched to validate the code, prior to inserting the membership row),
    // so its member_count is one behind -- correct that here too.
    setGroups((prev) => [{ ...group, member_count: (group.member_count || 0) + 1 }, ...prev])
    navigate(`/compete/group/${group.id}`)
  }

  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('compete.title')} subtitle={t('compete.subtitle')} />
        </div>

        {!user ? (
          <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth-lg p-8 text-center space-y-4">
            <p className="font-display font-bold text-xl text-charcoal-900 dark:text-sand">
              {t('compete.signUpPromptTitle')}
            </p>
            <p className="text-charcoal-600 dark:text-charcoal-300 text-sm max-w-md mx-auto">
              {t('compete.signUpPromptDesc')}
            </p>
            <SambaButton variant="gold" onClick={() => navigate('/')}>
              {t('compete.createAccount')}
            </SambaButton>
          </div>
        ) : loading ? (
          <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-12">{t('account.loading')}</p>
        ) : (
          <div className="space-y-6">
            {groups.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/compete/group/${g.id}`)}
                    className="text-left rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth-lg p-5 hover:shadow-depth-gold transition-shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {g.avatar_url ? (
                        <img src={g.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-12 h-12 rounded-full bg-emerald text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
                          {g.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-display font-bold text-charcoal-900 dark:text-sand truncate">{g.name}</p>
                        <p className="text-xs text-charcoal-600 dark:text-charcoal-300">
                          {t('compete.memberCount', { count: g.member_count || 1 })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-2xl border-2 border-dashed border-charcoal-900/20 dark:border-white/20 p-6 text-center hover:border-emerald dark:hover:border-mint transition-colors"
              >
                <p className="font-display font-bold text-charcoal-900 dark:text-sand">{t('compete.createTitle')}</p>
                <p className="text-charcoal-600 dark:text-charcoal-300 text-xs mt-1">{t('compete.createDescActive')}</p>
              </button>
              <button
                onClick={() => setShowJoin(true)}
                className="rounded-2xl border-2 border-dashed border-charcoal-900/20 dark:border-white/20 p-6 text-center hover:border-emerald dark:hover:border-mint transition-colors"
              >
                <p className="font-display font-bold text-charcoal-900 dark:text-sand">{t('compete.joinTitle')}</p>
                <p className="text-charcoal-600 dark:text-charcoal-300 text-xs mt-1">{t('compete.joinDescActive')}</p>
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />}
    </AppBackground>
  )
}
