import { useEffect, useState } from 'react'
import { getTheme, toggleTheme } from '../../lib/theme'
import { useTranslation } from '../../lib/i18n'

// Sun/moon toggle. Rendered as part of HeaderControls (top-right icon row,
// alongside Home and the language selector) so it's available on every page
// regardless of whether that page uses NavBar.
export default function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setThemeState] = useState(getTheme())

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  function handleClick() {
    setThemeState(toggleTheme())
  }

  return (
    <button
      onClick={handleClick}
      aria-label={theme === 'dark' ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
      className="w-9 h-9 shrink-0 rounded-full bg-white dark:bg-night-card shadow-depth border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center text-charcoal-900 dark:text-sand hover:bg-sand dark:hover:bg-night active:scale-95 transition-all"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  )
}
