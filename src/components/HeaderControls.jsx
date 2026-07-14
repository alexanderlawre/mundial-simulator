import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'
import ThemeToggle from './ThemeToggle'
import LanguageSelector from './LanguageSelector'
import ResetProfileButton from './ResetProfileButton'

// Persistent top-right icon row, rendered once by AppBackground so it's in
// the same place on every page (including ones like Onboarding/Dashboard
// that don't render NavBar). Order, closest-to-center first: Home -> dark/
// light mode toggle -> language selector -> reset profile. Keeping all four
// grouped in a single row (instead of Home living separately inside each
// page's inline NavBar, Theme/Language floating in opposite corners, and
// Reset Profile living inline in Dashboard's own header) is what keeps them
// visually "in line" with each other and available from anywhere.
export default function HeaderControls() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const onDashboard = location.pathname === '/dashboard'

  return (
    <div
      className="fixed z-30 flex items-center gap-2"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)', right: 'calc(env(safe-area-inset-right, 0px) + 1rem)' }}
    >
      {!onDashboard && (
        <button
          onClick={() => navigate('/dashboard')}
          aria-label={t('common.home')}
          className="w-9 h-9 shrink-0 rounded-full bg-white dark:bg-night-card shadow-depth border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center text-charcoal-900 dark:text-sand hover:bg-sand dark:hover:bg-night active:scale-95 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5L12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
          </svg>
        </button>
      )}
      <ThemeToggle />
      <LanguageSelector />
      <ResetProfileButton />
    </div>
  )
}
