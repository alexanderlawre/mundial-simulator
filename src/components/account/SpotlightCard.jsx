import { useTranslation } from '../../lib/i18n'
import { getNation } from '../../data/nations'
import CountryFlag from '../common/CountryFlag'

// Shared between Account.jsx (the owner's own spotlighted runs, with an
// unpin control) and UserProfile.jsx (someone else's spotlighted runs,
// read-only) so both pages render the exact same card markup instead of
// duplicating it.
export const MODE_LABEL_KEYS = { historic: 'account.modeHistoric', custom: 'account.modeCustom', wc2026: 'account.modeWc2026' }

export function PinToggle({ pinned, onToggle }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={pinned ? t('account.unpin') : t('play.pinResult')}
      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${
        pinned ? 'text-gold' : 'text-charcoal-600/50 dark:text-charcoal-300/50 hover:text-charcoal-600 dark:hover:text-charcoal-300'
      }`}
    >
      {pinned ? '\u2605' : '\u2606'}
    </button>
  )
}

function SpotlightPodiumRow({ rank, label, name }) {
  const { tn } = useTranslation()
  if (!name) return null
  const nation = getNation(name)
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${rank === 1 ? 'bg-gold/15 border border-gold' : 'bg-white/70 dark:bg-night-card/70 border border-charcoal-900/10 dark:border-white/10'}`}>
      <span className="font-display text-xs font-bold text-charcoal-600 dark:text-charcoal-300 w-6 text-center shrink-0">{rank}</span>
      {nation && <CountryFlag nation={nation} size="sm" />}
      <span className="text-sm font-semibold flex-1 min-w-0 truncate text-left">{tn(name)}</span>
      <span className="text-xs text-charcoal-600 dark:text-charcoal-300 shrink-0">{label}</span>
    </div>
  )
}

// `onUnpin` is optional -- omit it (e.g. on a read-only profile page showing
// someone else's spotlight) to render the card without the star toggle.
export default function SpotlightCard({ entry, onUnpin }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold-light via-white dark:via-night-card to-gold-light/40 border-2 border-gold shadow-depth-gold p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide font-bold text-charcoal-900/70">
          {t(MODE_LABEL_KEYS[entry.mode] || 'account.modeCustom')}{entry.descriptor ? ` · ${entry.descriptor}` : ''}
        </p>
        {onUnpin && <PinToggle pinned onToggle={onUnpin} />}
      </div>
      <div className="space-y-1.5">
        <SpotlightPodiumRow rank={1} label={t('summary.winner')} name={entry.winner} />
        <SpotlightPodiumRow rank={2} label={t('summary.runnerUp')} name={entry.runnerUp} />
      </div>
    </div>
  )
}
