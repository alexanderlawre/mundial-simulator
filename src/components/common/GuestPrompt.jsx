import { useNavigate } from 'react-router-dom'
import SambaButton from './SambaButton'
import { useTranslation } from '../../lib/i18n'

// Reusable dismissible "create an account to save your progress" prompt,
// shown to guests (no Supabase session) at a few natural checkpoints:
// the header profile icon, right after finishing a World Cup simulation,
// and right after confirming league predictions. Gameplay itself never
// requires an account (see App.jsx's guest-accessible routes) -- this is
// purely an opt-in nudge, never a blocker.
export default function GuestPrompt({ title, description, onDismiss, className = '' }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div
      className={`relative rounded-2xl bg-white dark:bg-night-card border border-gold/40 shadow-depth-lg p-4 sm:p-5 ${className}`}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('guest.dismiss')}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-charcoal-600 dark:text-charcoal-300 hover:bg-sand dark:hover:bg-night transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <p className="font-display font-bold text-charcoal-900 dark:text-sand pr-6">
        {title || t('guest.promptTitle')}
      </p>
      <p className="text-charcoal-600 dark:text-charcoal-300 text-sm mt-1 mb-3">
        {description || t('guest.promptDesc')}
      </p>
      <div className="flex gap-2">
        <SambaButton size="sm" variant="gold" onClick={() => navigate('/')}>
          {t('guest.createAccount')}
        </SambaButton>
        {onDismiss && (
          <SambaButton size="sm" variant="outline" onClick={onDismiss}>
            {t('guest.notNow')}
          </SambaButton>
        )}
      </div>
    </div>
  )
}
