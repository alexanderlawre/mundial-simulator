import { useState } from 'react'
import { getScoringRulesCopy } from '../../data/scoringRules'
import { useTranslation } from '../../lib/i18n'

// Collapsible "How points work" box, shared by the group dashboard and the
// create-group flow. Copy is generated from data/scoringRules.js -- the
// single source of truth also used by src/lib/leagueScoring.js -- so the
// numbers shown here can never drift out of sync with the actual scoring
// math. English-only for now (see i18n.jsx convention notes): non-English
// UI chrome around this box still translates, this block just isn't
// localized yet.
export default function HowPointsWorkBox({ defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)
  const { t } = useTranslation()
  const sections = getScoringRulesCopy()

  return (
    <div className={`rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="font-display font-bold text-sm text-charcoal-900 dark:text-sand">
          {t('compete.howPointsWork')}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 shrink-0 text-charcoal-600 dark:text-charcoal-300 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-charcoal-900/5 dark:border-white/5 pt-3">
          {sections.map((s) => (
            <div key={s.title}>
              <p className="font-semibold text-sm text-charcoal-900 dark:text-sand">{s.title}</p>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-300 mt-0.5 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
