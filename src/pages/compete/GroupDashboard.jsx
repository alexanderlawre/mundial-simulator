import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LEAGUES, getLeague } from '../../data/leagues'
import { fetchGroup, fetchGroupMembers, fetchGroupTablePrediction } from '../../lib/storage'
import { predictionsLocked, PREDICTIONS_LOCK_AT } from '../../lib/predictionsLock'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import HowPointsWorkBox from '../../components/compete/HowPointsWorkBox'
import PredictedTableView from '../../components/leagues/PredictedTableView'
import GroupAdminPanel from './GroupAdminPanel'
import TableLeaderboard from './TableLeaderboard'
import OverallLeaderboard from './OverallLeaderboard'
import MatchweekLeaderboard from './MatchweekLeaderboard'

const TABS = ['members', 'table', 'overall', 'matchweek']

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

// A member's predicted table for one league, shown in a small popup when
// tapping their circular per-league button on the roster. Reuses
// fetchGroupTablePrediction against the *target* member's userId --
// allowed by RLS's "group members can read locked predictions" policy
// (see supabase/schema.sql), same call the leaderboards make. `isSelf`
// skips the lock check entirely -- you can always see your own picks.
function MemberTableModal({ groupId, leagueKey, member, isSelf, onClose }) {
  const { t } = useTranslation()
  const league = getLeague(leagueKey)
  const locked = !isSelf && !predictionsLocked()
  const [prediction, setPrediction] = useState(undefined)

  useEffect(() => {
    if (locked) return
    let cancelled = false
    fetchGroupTablePrediction(member.userId, groupId, leagueKey).then((data) => {
      if (!cancelled) setPrediction(data)
    })
    return () => {
      cancelled = true
    }
  }, [member.userId, groupId, leagueKey, locked])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-night-card rounded-3xl shadow-depth-lg overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-charcoal-900 dark:text-sand truncate">
              {member.name || t('compete.unnamedMember')} \u00b7 {league?.name}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-900/5 dark:hover:bg-white/10"
              aria-label={t('leagues.close', null, 'Close')}
            >
              ✕
            </button>
          </div>
          {locked ? (
            <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-8">{t('profile.locked', { date: UNLOCK_LABEL })}</p>
          ) : prediction === undefined ? (
            <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-8">{t('account.loading')}</p>
          ) : prediction?.order ? (
            <PredictedTableView league={league} order={prediction.order} />
          ) : (
            <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-8">{t('compete.memberHasNotPredicted')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GroupDashboard() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const [activeLeague, setActiveLeague] = useState(null)
  const [activeTab, setActiveTab] = useState('members')
  const [openMemberTable, setOpenMemberTable] = useState(null) // { member, leagueKey }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchGroup(groupId), fetchGroupMembers(groupId)]).then(([groupData, memberData]) => {
      if (cancelled) return
      setGroup(groupData)
      setMembers(memberData)
      setActiveLeague(groupData?.leagues_enabled?.[0] || null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [groupId])

  if (loading) {
    return (
      <AppBackground>
        <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-16">{t('account.loading')}</p>
      </AppBackground>
    )
  }

  if (!group) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('compete.groupNotFound')}</p>
          <SambaButton onClick={() => navigate('/compete')}>{t('common.back')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const isAdmin = group.admin_user_id === user?.id
  const enabledLeagues = LEAGUES.filter((l) => group.leagues_enabled?.includes(l.key))

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <NavBar title={group.name} subtitle={t('compete.memberCount', { count: group.member_count || members.length || 1 })} />

        <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth-lg p-5 space-y-4">
          <div className="flex items-start gap-3">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-14 h-14 rounded-full bg-emerald text-white flex items-center justify-center font-display font-bold text-xl shrink-0">
                {group.name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {group.bio && <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{group.bio}</p>}
              <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-1">
                {t('compete.joinCodeLabel')}: <span className="font-display font-bold tracking-widest text-charcoal-900 dark:text-sand">{group.join_code}</span>
              </p>
            </div>
            {isAdmin && (
              <SambaButton size="sm" variant="outline" onClick={() => setShowAdmin(true)}>
                {t('compete.manageGroup')}
              </SambaButton>
            )}
          </div>
          <HowPointsWorkBox />
        </div>

        {enabledLeagues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {enabledLeagues.map((league) => (
              <button
                key={league.key}
                onClick={() => setActiveLeague(league.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeLeague === league.key ? 'text-white border-transparent' : 'bg-white dark:bg-night-card text-charcoal-900 dark:text-sand border-charcoal-900/15 dark:border-white/15'
                }`}
                style={activeLeague === league.key ? { backgroundColor: league.colors.accent } : undefined}
              >
                {league.name}
              </button>
            ))}
          </div>
        )}

        {activeLeague && (
          <SambaButton variant="gold" className="w-full" onClick={() => navigate(`/compete/group/${groupId}/predict/${activeLeague}`)}>
            {t('compete.predictForGroup')}
          </SambaButton>
        )}

        <div className="flex gap-2 border-b border-charcoal-900/10 dark:border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === tab ? 'border-emerald text-emerald dark:text-mint dark:border-mint' : 'border-transparent text-charcoal-600 dark:text-charcoal-300'
              }`}
            >
              {t(`compete.tab_${tab}`)}
            </button>
          ))}
        </div>

        {activeTab === 'members' && (
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10">
                <button
                  onClick={() => (m.userId === user?.id ? navigate('/account') : navigate(`/profile/${m.userId}`))}
                  aria-label={t('compete.viewProfile', { name: m.name || t('compete.unnamedMember') })}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-emerald text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
                      {(m.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm text-charcoal-900 dark:text-sand truncate min-w-0">
                    {m.name || t('compete.unnamedMember')}
                    {m.role === 'admin' && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-gold-dark dark:text-gold font-semibold">{t('compete.adminBadge')}</span>
                    )}
                  </span>
                </button>
                <div className="flex gap-1.5 shrink-0">
                  {enabledLeagues.map((league) => (
                    <button
                      key={league.key}
                      onClick={() =>
                        m.userId === user?.id
                          ? navigate(`/compete/group/${groupId}/predict/${league.key}`)
                          : setOpenMemberTable({ member: m, leagueKey: league.key })
                      }
                      title={league.name}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-display font-bold text-white shrink-0"
                      style={{ backgroundColor: league.colors.accent }}
                    >
                      {league.name.slice(0, 1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'table' && activeLeague && <TableLeaderboard groupId={groupId} leagueKey={activeLeague} />}
        {activeTab === 'overall' && activeLeague && <OverallLeaderboard groupId={groupId} leagueKey={activeLeague} />}
        {activeTab === 'matchweek' && <MatchweekLeaderboard />}
      </div>

      {showAdmin && (
        <GroupAdminPanel
          group={group}
          members={members}
          onClose={() => setShowAdmin(false)}
          onUpdated={(updated) => setGroup(updated)}
          onMemberRemoved={(userId) => setMembers((prev) => prev.filter((m) => m.userId !== userId))}
        />
      )}

      {openMemberTable && (
        <MemberTableModal
          groupId={groupId}
          leagueKey={openMemberTable.leagueKey}
          member={openMemberTable.member}
          isSelf={openMemberTable.member.userId === user?.id}
          onClose={() => setOpenMemberTable(null)}
        />
      )}
    </AppBackground>
  )
}
