import ClubBadge from '../leagues/ClubBadge'
import { useTranslation } from '../../lib/i18n'

// UEFA-style zone colours, shared with the "Predict the League" Champions
// League table: top 8 straight to the Round of 16, 9-24 to the play-offs.
export function zoneColor(rank) {
  if (rank <= 8) return '#10b981'
  if (rank <= 24) return '#6ee7b7'
  return '#ef4444'
}

export default function UclLeagueTable({ rows, clubs, selectedClub, onSelect }) {
  const { t } = useTranslation()
  const th = 'py-2 px-1 font-semibold text-center'
  const optional = 'hidden sm:table-cell'
  return (
    <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-charcoal-600 dark:text-charcoal-300 text-[11px] uppercase tracking-wide border-b border-charcoal-900/10 dark:border-white/10">
            <th className="py-2 pl-3 pr-1 w-9 text-left">#</th>
            <th className="py-2 text-left">{t('play.team')}</th>
            <th className={th}>{t('play.played')}</th>
            <th className={`${th} ${optional}`}>{t('play.won')}</th>
            <th className={`${th} ${optional}`}>{t('play.drawn')}</th>
            <th className={`${th} ${optional}`}>{t('play.lost')}</th>
            <th className={`${th} ${optional}`}>{t('ucl.gf')}</th>
            <th className={`${th} ${optional}`}>{t('ucl.ga')}</th>
            <th className={th}>{t('play.gd')}</th>
            <th className={`${th} pr-3`}>{t('play.pts')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const club = clubs[row.key]
            const rank = i + 1
            const selected = selectedClub === row.key
            return (
              <tr
                key={row.key}
                onClick={() => onSelect?.(row.key)}
                className={`border-b last:border-0 border-charcoal-900/5 dark:border-white/5 tabular-nums cursor-pointer transition-colors ${
                  selected ? 'bg-gold/20' : 'hover:bg-sand/60 dark:hover:bg-night/60'
                } ${rank === 8 || rank === 24 ? 'border-b-2 border-b-charcoal-900/20 dark:border-b-white/20' : ''}`}
              >
                <td className="py-1.5 pl-0 pr-1 text-xs text-charcoal-600 dark:text-charcoal-300">
                  <span className="flex items-center">
                    <span className="inline-block w-1 h-6 rounded-r mr-2" style={{ backgroundColor: zoneColor(rank) }} />
                    {rank}
                  </span>
                </td>
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <ClubBadge club={club} size="xs" />
                    <span className="truncate font-medium text-charcoal-900 dark:text-sand">{club.name}</span>
                  </span>
                </td>
                <td className="text-center">{row.played}</td>
                <td className={`text-center ${optional}`}>{row.won}</td>
                <td className={`text-center ${optional}`}>{row.drawn}</td>
                <td className={`text-center ${optional}`}>{row.lost}</td>
                <td className={`text-center ${optional}`}>{row.gf}</td>
                <td className={`text-center ${optional}`}>{row.ga}</td>
                <td className="text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="text-center pr-3 font-bold text-charcoal-900 dark:text-sand">{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
