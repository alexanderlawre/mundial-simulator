import { useTranslation } from '../../lib/i18n'

// Matchweek leaderboard: per spec, renders a clear "unlocks once matchday
// predictions go live" empty state rather than fake data -- there's no
// live fixtures/results source wired yet (see src/lib/fixturesSource.js).
export default function MatchweekLeaderboard() {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth p-8 text-center space-y-1.5">
      <p className="font-display font-bold text-charcoal-900 dark:text-sand">{t('compete.matchweekLeaderboardTitle')}</p>
      <p className="text-charcoal-600 dark:text-charcoal-300 text-sm max-w-sm mx-auto">{t('compete.matchweekLeaderboardDesc')}</p>
    </div>
  )
}
