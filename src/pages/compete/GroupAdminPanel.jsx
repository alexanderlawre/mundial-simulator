import { useState } from 'react'
import { LEAGUES } from '../../data/leagues'
import { updateGroup, regenerateJoinCode, removeGroupMember, uploadGroupAvatar } from '../../lib/storage'
import { useTranslation } from '../../lib/i18n'
import SambaButton from '../../components/common/SambaButton'

// Admin-only panel: edit name/bio/picture/leagues, remove members,
// regenerate the join code. Only ever rendered when the current user is
// the group's admin (gated by the caller, GroupDashboard.jsx) -- RLS on
// the `groups`/`group_members` tables is still the real enforcement
// boundary server-side, this is just the UI surface.
export default function GroupAdminPanel({ group, members, onClose, onUpdated, onMemberRemoved }) {
  const { t } = useTranslation()
  const [name, setName] = useState(group.name)
  const [bio, setBio] = useState(group.bio || '')
  const [leaguesEnabled, setLeaguesEnabled] = useState(group.leagues_enabled || [])
  const [avatarPreview, setAvatarPreview] = useState(group.avatar_url || null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [joinCode, setJoinCode] = useState(group.join_code)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState(null)

  function toggleLeague(key) {
    setLeaguesEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (saving) return
    if (!name.trim()) {
      setError(t('compete.nameRequired'))
      return
    }
    setSaving(true)
    setError('')

    let avatarUrl = group.avatar_url
    if (avatarFile) {
      const uploadResult = await uploadGroupAvatar(group.id, avatarFile)
      if (uploadResult.ok) avatarUrl = uploadResult.url
    }

    const result = await updateGroup(group.id, { name: name.trim(), bio: bio.trim(), leaguesEnabled, avatarUrl })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onUpdated({ ...group, name: name.trim(), bio: bio.trim(), leagues_enabled: leaguesEnabled, avatar_url: avatarUrl })
  }

  async function handleRegenerateCode() {
    const result = await regenerateJoinCode(group.id)
    if (result.ok) {
      setJoinCode(result.data.join_code)
      onUpdated({ ...group, join_code: result.data.join_code })
    } else {
      setError(result.error)
    }
  }

  async function handleRemoveMember(userId) {
    setRemovingId(userId)
    const result = await removeGroupMember(group.id, userId)
    setRemovingId(null)
    if (result.ok) {
      onMemberRemoved(userId)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-night-card rounded-3xl shadow-depth-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-charcoal-900 dark:text-sand">{t('compete.manageGroup')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-900/5 dark:hover:bg-white/10"
              aria-label={t('leagues.close', null, 'Close')}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="w-16 h-16 rounded-full shrink-0 bg-sand dark:bg-night border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center overflow-hidden cursor-pointer">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-charcoal-600 dark:text-charcoal-300" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-300">{t('compete.groupPictureHint')}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 dark:text-charcoal-300 mb-1">{t('compete.groupNameLabel')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-sand dark:bg-night text-charcoal-900 dark:text-sand text-sm outline-none focus:ring-2 focus:ring-emerald"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 dark:text-charcoal-300 mb-1">{t('compete.groupBioLabel')}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-sand dark:bg-night text-charcoal-900 dark:text-sand text-sm outline-none focus:ring-2 focus:ring-emerald resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 dark:text-charcoal-300 mb-2">{t('compete.leaguesUsedLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {LEAGUES.map((league) => {
                  const active = leaguesEnabled.includes(league.key)
                  return (
                    <button
                      key={league.key}
                      type="button"
                      onClick={() => toggleLeague(league.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active ? 'text-white border-transparent' : 'bg-white dark:bg-night-card text-charcoal-900 dark:text-sand border-charcoal-900/15 dark:border-white/15'
                      }`}
                      style={active ? { backgroundColor: league.colors.accent } : undefined}
                    >
                      {league.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-600 dark:text-charcoal-300 mb-1">{t('compete.joinCodeLabel')}</label>
              <div className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 rounded-xl bg-sand dark:bg-night border border-charcoal-900/15 dark:border-white/15 text-center tracking-[0.3em] font-display font-bold text-charcoal-900 dark:text-sand">
                  {joinCode}
                </span>
                <SambaButton variant="outline" size="sm" onClick={handleRegenerateCode} type="button">
                  {t('compete.regenerateCode')}
                </SambaButton>
              </div>
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}

            <SambaButton variant="gold" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? t('login.submitting') : t('compete.saveChanges')}
            </SambaButton>
          </div>

          <div className="border-t border-charcoal-900/10 dark:border-white/10 pt-4">
            <p className="text-xs font-semibold text-charcoal-600 dark:text-charcoal-300 mb-2">{t('compete.membersLabel')}</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-sand dark:bg-night">
                  <span className="text-sm text-charcoal-900 dark:text-sand truncate">
                    {m.name || t('compete.unnamedMember')}
                    {m.role === 'admin' && <span className="ml-2 text-[10px] uppercase tracking-wide text-gold-dark dark:text-gold font-semibold">{t('compete.adminBadge')}</span>}
                  </span>
                  {m.role !== 'admin' && (
                    <button
                      onClick={() => handleRemoveMember(m.userId)}
                      disabled={removingId === m.userId}
                      className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline shrink-0 disabled:opacity-40"
                    >
                      {t('compete.removeMember')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
