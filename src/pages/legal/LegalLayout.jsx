import { Link } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'

// Shared chrome for the three legal pages (Privacy/Terms/Cookies) — simple
// prose layout consistent with the rest of the app's styling.
export default function LegalLayout({ title, updated, children }) {
  return (
    <AppBackground>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link to="/dashboard" className="text-xs text-forest dark:text-mint font-semibold hover:underline">
          ← Back to Mundial
        </Link>
        <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-wide text-forest dark:text-mint mt-2">{title}</h1>
        {updated && <p className="text-charcoal-600 dark:text-charcoal-300 text-xs mt-1">Last updated: {updated}</p>}
        <div className="mt-6 bg-white/90 dark:bg-night-card/90 rounded-2xl shadow-depth-lg p-6 sm:p-8 space-y-5 text-sm text-charcoal-900 dark:text-sand leading-relaxed [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-lg [&_h2]:text-forest dark:[&_h2]:text-mint [&_h2]:pt-2 [&_a]:text-emerald [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:py-1 [&_td]:py-1 [&_td]:pr-2 [&_th]:pr-2 [&_thead]:border-b [&_thead]:border-charcoal-900/10 dark:[&_thead]:border-white/10">
          {children}
        </div>
      </div>
    </AppBackground>
  )
}
