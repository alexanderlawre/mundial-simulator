import { useNavigate } from 'react-router-dom'
import { clearProfile, clearActiveTournament, getProfile } from '../lib/storage'
import { useTranslation } from '../lib/i18n'

// Icon button that clears the local profile and any in-progress tournament,
// then returns to onboarding. Rendered as part of HeaderControls (top-right
// icon row, outermost/rightmost -- Home, theme toggle, language selector,
// then this) instead of living inline in Dashboard's own header, so it's
// available from anywhere once a profile exists. Only rendered when there's
// actually a profile to reset (e.g. hidden during onboarding itself), and
// confirms first since it's destructive and now just one tap away on every
// screen rather than a clearly-labeled Dashboard-only button.
export default function ResetProfileButton() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const profile = getProfile()
  if (!profile) return null

  function handleClick() {
    if (!window.confirm(t('dashboard.resetProfileConfirm'))) return
    clearProfile()
    clearActiveTournament()
    navigate('/')
  }

  return (
    <button
      onClick={handleClick}
      aria-label={t('dashboard.resetProfile')}
      className="w-9 h-9 shrink-0 rounded-full bg-white dark:bg-night-card shadow-depth border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center text-charcoal-900 dark:text-sand hover:bg-sand dark:hover:bg-night active:scale-95 transition-all"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 109-9" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
  )
}
