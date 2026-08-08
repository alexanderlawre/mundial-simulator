import { clubsByKey } from '../../data/leagues'
import { getNation } from '../../data/nations'
import CountryFlag from '../common/CountryFlag'
import ClubBadge from './ClubBadge'
import { useTranslation } from '../../lib/i18n'

// Small row of up to 3 mini badges previewing the user's current top picks
// for a league -- shared by both LeagueCard sizes below, and by anywhere
// else a compact "here's what they predicted" preview is useful. Renders
// nothing if nothing's placed yet, so it's a no-op visually for a league
// the user hasn't touched. `className` lets callers control spacing (e.g.
// no top margin inline, but one when it wraps onto its own line on a
// narrow phone width).
export function TopPicksPreview({ league, order, className = 'mt-2' }) {
  if (!order?.[0]) return null
  const clubs = clubsByKey(league.key)
  const topThree = order.slice(0, 3).filter(Boolean)
  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      {topThree.map((clubKey) => {
        const club = clubs[clubKey]
        if (!club) return null
        return (
          <span key={clubKey} className="rounded-full ring-2 ring-white/80 dark:ring-night-card bg-white/10">
            <ClubBadge club={club} size="xs" />
          </span>
        )
      })}
    </div>
  )
}

// Single source of truth for a league's card: gradient background in the
// league's brand colors, a small country flag next to the name, a
// prediction-status line, and (via TopPicksPreview) the top 3 clubs the
// user has currently predicted for it. Laid out as a full-width horizontal
// row (not a grid tile) so a list of these stacks one after another --
// used by both the Leagues Hub (full size) and the Account page's
// "Submitted Tables" list (compact) -- pass `compact` to switch between
// the two without duplicating the markup. flex-wrap keeps it readable on
// narrow phone widths where the picks preview would otherwise overflow.
export default function LeagueCard({ league, prediction, onClick, compact = false }) {
  const { t } = useTranslation()
  const nation = getNation(league.country)
  const statusLabel = prediction?.confirmed ? t('leagues.predictionsLocked') : prediction ? t('leagues.inProgress') : null
  const subtitle = statusLabel || (compact ? t('account.notStarted') : t('leagues.clubCount', { count: league.clubs.length }))

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl shadow-depth-lg overflow-hidden hover:-translate-y-0.5 active:scale-[0.99] transition-all"
    >
      <div
        className={`flex items-center justify-between gap-3 flex-wrap text-white ${compact ? 'p-3' : 'p-4 sm:p-5'}`}
        style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CountryFlag nation={nation} size={compact ? 'xs' : 'sm'} />
          <div className="min-w-0">
            <p className={`font-display font-bold truncate ${compact ? 'text-sm' : 'text-lg sm:text-xl'}`}>{league.name}</p>
            <p className={`text-white/80 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>{subtitle}</p>
          </div>
        </div>
        <TopPicksPreview league={league} order={prediction?.order} className="mt-0" />
      </div>
    </button>
  )
}
