import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useTranslation } from '../../lib/i18n'
import GuestPrompt from './GuestPrompt'

// Header icon linking to /account when logged in. Guests (no Supabase
// session) instead get an empty/outline avatar that opens a dismissible
// "create an account" popover on click -- gameplay itself never requires
// an account, this is purely an opt-in nudge (see App.jsx's guest-
// accessible routes).
export default function ProfileButton() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [showPrompt, setShowPrompt] = useState(false)

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowPrompt((v) => !v)}
          aria-label={t('guest.profileTitle')}
          className="w-9 h-9 shrink-0 rounded-full bg-white/80 dark:bg-night-card/80 text-charcoal-600 dark:text-charcoal-300 shadow-depth border border-dashed border-charcoal-900/25 dark:border-white/25 flex items-center justify-center hover:bg-white dark:hover:bg-night-card active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4.5 20c1.7-3.6 5-5.5 7.5-5.5s5.8 1.9 7.5 5.5" />
          </svg>
        </button>
        {showPrompt && (
          <GuestPrompt
            className="absolute top-11 right-0 w-72 z-40"
            onDismiss={() => setShowPrompt(false)}
          />
        )}
      </div>
    )
  }

  const initial = (user.user_metadata?.name || user.email || '?').trim().charAt(0).toUpperCase()

  return (
    <button
      onClick={() => navigate('/account')}
      aria-label={t('account.title')}
      className="w-9 h-9 shrink-0 rounded-full bg-emerald text-white shadow-depth border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center font-display font-bold text-sm hover:brightness-105 active:scale-95 transition-all"
    >
      {initial}
    </button>
  )
}
