import { clubsByKey } from '../../data/leagues'
import { getNation } from '../../data/nations'
import CountryFlag from '../common/CountryFlag'
import ClubBadge from './ClubBadge'
import { useTranslation } from '../../lib/i18n'

// Small row of up to 3 mini badges previewing the user's current top picks
// for a league -- shared by LeagueCard's two sizes below, and by anywhere
// else a compact "here's what they predicted" preview is useful. Renders
// nothing if nothing's placed yet, so it's a no-op visually for a league
// the user hasn't touched.
export function TopPicksPreview({ league, order }) {
  if (!order?.[0]) return null
  const clubs = clubsByKey(league.key)
  const topThree = order.slice(0, 3).filter(Boolean)
  return (
    <div className="flex items-center gap-1.5 mt-2">
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
// prediction-status pill, and (via TopPicksPreview) the top 3 clubs the
// user has currently predicted for it. Used by both the Leagues Hub (full
// size) and the Account page's "Submitted Tables" grid (compact) -- pass
// `compact` to switch between the two without duplicating the markup.
export default function LeagueCard({ league, prediction, onClick, compact = false }) {
  const { t } = useTranslation()
  const nation = getNation(league.country)
  const statusLabel = prediction?.confirmed ? t('leagues.predictionsLocked') : prediction ? t('leagues.inProgress') : null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl shadow-depth-lg overflow-hidden hover:-translate-y-1 active:scale-[0.98] transition-all ${compact ? '!rounded-xl shadow-depth' : ''}`}
    >
      <div
        className={compact ? 'p-3 text-white' : 'p-5 text-white'}
        style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
      >
        <div className="flex items-center gap-2">
          <CountryFlag nation={nation} size="xs" />
          <p className={compact ? 'font-display font-bold text-sm' : 'font-display text-2xl font-extrabold'}>{league.name}</p>
        </div>
        {compact ? (
          <p className="text-[11px] text-white/80 mt-0.5">{statusLabel || t('account.notStarted')}</p>
        ) : (
          <>
            {statusLabel && (
              <span className="inline-block text-[10px] uppercase tracking-wide font-semibold bg-white/25 rounded-full px-2 py-0.5 mt-2">
                {statusLabel}
              </span>
            )}
            <p className="text-white/80 text-xs mt-1">{t('leagues.clubCount', { count: league.clubs.length })}</p>
          </>
        )}
        <TopPicksPreview league={league} order={prediction?.order} />
      </div>
    </button>
  )
}
