import ClubBadge from './ClubBadge'
import { clubsByKey, getZoneForRank } from '../../data/leagues'
import { useTranslation } from '../../lib/i18n'

// Read-only numbered table row -- extracted from LeaguePredict.jsx's
// former inline `LockedRow` so both the solo prediction view and the
// Groups member-table popover render an identical locked/confirmed
// table with zero duplicated markup.
export function PredictedTableRow({ index, club, accent, zone, score }) {
  const { t } = useTranslation()
  if (!club) return null
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/90 dark:bg-night-card/90 border-y border-r border-y-charcoal-900/10 dark:border-y-white/10 border-r-charcoal-900/10 dark:border-r-white/10 border-l-4"
      style={{ borderLeftColor: zone?.color || 'transparent' }}
    >
      <span className="w-6 text-center font-display font-bold text-sm text-charcoal-600 dark:text-charcoal-300 tabular-nums shrink-0">
        {index + 1}
      </span>
      <ClubBadge club={club} size="sm" accent={accent} />
      <span className="flex-1 min-w-0 truncate font-medium text-charcoal-900 dark:text-sand text-sm">{club.name}</span>
      {score != null && (
        <span className="shrink-0 text-xs font-display font-bold text-emerald dark:text-mint tabular-nums">{t('leagues.scorePts', { score })}</span>
      )}
    </div>
  )
}

// league: a LEAGUES entry. order: array of club keys, 0-indexed by
// predicted table position. perTeamScore (optional): { [clubKey]: pts }
// from leagueScoring.scoreTablePrediction, shown per row once real
// results exist to score against.
export default function PredictedTableView({ league, order, perTeamScore }) {
  if (!league || !order) return null
  const clubs = clubsByKey(league.key)
  return (
    <div className="space-y-1.5">
      {order.map((clubKey, i) => (
        <PredictedTableRow
          key={clubKey || i}
          index={i}
          club={clubs[clubKey]}
          accent={league.colors.accent}
          zone={getZoneForRank(league, i + 1)}
          score={perTeamScore?.[clubKey]}
        />
      ))}
    </div>
  )
}
