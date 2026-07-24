import CountryFlag from '../common/CountryFlag'
import { useTranslation } from '../../lib/i18n'

export default function TeamBadge({ team, size = 'md', showRating = true, selected = false, onClick, right }) {
  const { tn } = useTranslation()
  const clickable = typeof onClick === 'function'
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/90 dark:bg-night-card/90 border transition-all
        ${selected ? 'border-gold ring-2 ring-gold shadow-depth-gold' : 'border-charcoal-900/10 dark:border-white/10 shadow-depth'}
        ${clickable ? 'cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]' : ''}`}
    >
      <CountryFlag nation={team} size={size} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {team.fifaCode && (
            <span translate="no" className="notranslate font-display text-[10px] font-bold tracking-widest text-charcoal-600 dark:text-charcoal-300 bg-charcoal-900/5 rounded px-1.5 py-0.5 shrink-0 tabular-nums">
              {team.fifaCode}
            </span>
          )}
          <p className="font-display font-semibold text-charcoal-900 dark:text-sand truncate">{tn(team.name)}</p>
        </div>
        {showRating && (
          <p className="text-xs text-charcoal-600 dark:text-charcoal-300 tabular-nums">OVR {team.rating ?? '--'}</p>
        )}
      </div>
      {right}
    </div>
  )
}
