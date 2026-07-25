import { useState } from 'react'
import { LEAGUES } from '../../data/leagues'
import { createGroup, uploadGroupAvatar } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'
import SambaButton from '../../components/common/SambaButton'
import HowPointsWorkBox from '../../components/compete/HowPointsWorkBox'

// Create Group popup: name, bio, per-league toggles, a live "How points
// work" preview (pulled from the shared scoringRules config, never
// hardcoded a second time here), and an optional group picture. The
// creator is made group admin automatically by storage.createGroup --
// this component just calls it and hands the new row back to the caller.
//
// "Add friends by email" from the original spec is intentionally left out
// of this pass: there's no transactional email service wired up in this
// repo, and doing it properly (pending-invite rows a joining user
// auto-attaches to) needs its own schema table that isn't in
// supabase/schema.sql yet. Flagged as a follow-up rather than half-built.
export default function CreateGroupModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [leaguesEnabled, setLeaguesEnabled] = useState([])
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleLeague(key) {
    setLeaguesEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    if (!name.trim()) {
      setError(t('compete.nameRequired'))
      return
    }
    if (leaguesEnabled.length === 0) {
      setError(t('compete.leaguesRequired'))
      return
    }
    setSubmitting(true)
    setError('')

    const result = await createGroup(user?.id, { name: name.trim(), bio: bio.trim(), leaguesEnabled })
    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    let group = result.data
    if (avatarFile) {
      const uploadResult = await uploadGroupAvatar(group.id, avatarFile)
      if (uploadResult.ok) group = { ...group, avatar_url: uploadResult.url }
    }

    setSubmitting(false)
    onCreated(group)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-night-card rounded-3xl shadow-depth-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-charcoal-900 dark:text-sand">{t('compete.createTitle')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-900/5 dark:hover:bg-white/10"
              aria-label={t('leagues.close', null, 'Close')}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder={t('compete.groupNamePlaceholder')}
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
                placeholder={t('compete.groupBioPlaceholder')}
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
                        active
                          ? 'text-white border-transparent'
                          : 'bg-white dark:bg-night-card text-charcoal-900 dark:text-sand border-charcoal-900/15 dark:border-white/15'
                      }`}
                      style={active ? { backgroundColor: league.colors.accent } : undefined}
                    >
                      {league.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <HowPointsWorkBox />

            {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <SambaButton variant="outline" className="flex-1" onClick={onClose} type="button">
                {t('play.cancel')}
              </SambaButton>
              <SambaButton variant="gold" className="flex-1" type="submit" disabled={submitting}>
                {submitting ? t('login.submitting') : t('compete.createTitle')}
              </SambaButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
