import { useState } from 'react'
import { LANGUAGES, useTranslation } from '../../lib/i18n'

// Flag-based language selector. Rendered as part of HeaderControls (top-right
// icon row, outermost/rightmost of the group -- Home, then theme toggle,
// then this) so it's available on every page regardless of whether that page
// uses NavBar.
export default function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('common.changeLanguage')}
        aria-expanded={open}
        className="w-7 h-7 rounded-full bg-white dark:bg-night-card shadow-depth border border-charcoal-900/10 dark:border-white/10 flex items-center justify-center overflow-hidden hover:bg-sand dark:hover:bg-night active:scale-95 transition-all"
      >
        <span className={`fi fis fi-${current.flagIso2} block !w-full !h-full bg-cover bg-center`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-40 rounded-xl bg-white dark:bg-night-card shadow-depth-lg border border-charcoal-900/10 dark:border-white/10 overflow-hidden py-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-sand dark:hover:bg-night transition-colors
                  ${l.code === language ? 'font-semibold text-forest dark:text-mint' : 'text-charcoal-900 dark:text-sand'}`}
              >
                <span className="w-5 h-5 rounded-full overflow-hidden inline-block shrink-0">
                  <span className={`fi fis fi-${l.flagIso2} block !w-full !h-full bg-cover bg-center`} />
                </span>
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
