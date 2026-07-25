import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../lib/i18n'

// Back arrow (defaults to browser history back), shared across every page so
// users can always navigate away without getting stuck. The Home icon lives
// in the global HeaderControls row (top-right, alongside the theme toggle
// and language selector) rather than here, so it stays in the same place on
// every page instead of duplicating per-page. Clearance below
// HeaderControls' fixed icon row is handled once, globally, by
// AppBackground's content wrapper -- not here -- so every page gets it
// consistently, including ones with a custom header instead of NavBar.
export default function NavBar({ title, subtitle, onBack }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack || (() => navigate(-1))}
        aria-label={t('common.back')}
        className="w-9 h-9 shrink-0 rounded-full bg-white dark:bg-night-card shadow-depth border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center text-charcoal-900 dark:text-sand hover:bg-sand dark:hover:bg-night active:scale-95 transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      {(title || subtitle) && (
        <div className="flex-1 min-w-0">
          {title && <h1 className="font-display font-bold text-xl sm:text-2xl md:text-3xl tracking-wide text-forest dark:text-mint truncate">{title}</h1>}
          {subtitle && <p className="text-charcoal-600 dark:text-charcoal-300 text-xs sm:text-sm truncate">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
