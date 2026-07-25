import { useState } from 'react'
import { joinGroupByCode } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'
import SambaButton from '../../components/common/SambaButton'

// Join-by-code popup. The 25-member cap is enforced server-side (see the
// `enforce_group_member_cap` trigger in supabase/schema.sql) -- the error
// message surfaced here for that case comes straight from
// storage.friendlyGroupError, so the "25/25" wording only lives in one
// place.
export default function JoinGroupModal({ onClose, onJoined }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    const result = await joinGroupByCode(user?.id, code)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onJoined(result.data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-night-card rounded-3xl shadow-depth-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-charcoal-900 dark:text-sand">{t('compete.joinTitle')}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-600 dark:text-charcoal-300 hover:bg-charcoal-900/5 dark:hover:bg-white/10"
              aria-label={t('leagues.close', null, 'Close')}
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('compete.joinDesc')}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder={t('compete.joinCodePlaceholder')}
              autoFocus
              className="w-full px-3 py-3 rounded-xl border border-charcoal-900/15 dark:border-white/15 bg-sand dark:bg-night text-charcoal-900 dark:text-sand text-center tracking-[0.3em] font-display font-bold text-lg uppercase outline-none focus:ring-2 focus:ring-emerald"
            />
            {error && <p className="text-red-600 dark:text-red-400 text-xs text-center">{error}</p>}
            <div className="flex gap-2">
              <SambaButton variant="outline" className="flex-1" onClick={onClose} type="button">
                {t('play.cancel')}
              </SambaButton>
              <SambaButton variant="gold" className="flex-1" type="submit" disabled={submitting}>
                {submitting ? t('login.submitting') : t('compete.joinTitle')}
              </SambaButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
