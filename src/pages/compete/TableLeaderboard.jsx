import { useEffect, useState } from 'react'
import { fetchGroupTablePredictions } from '../../lib/storage'
import { useTranslation } from '../../lib/i18n'

// Table leaderboard: ranks each member's locked preseason table call
// against the league's actual final table (src/lib/leagueScoring.js's
// scoreTablePrediction). There's no live final-table data source wired
// yet (see src/lib/fixturesSource.js -- stubbed until Phase 2), so this
// renders the list of members who have already locked in a prediction,
// with real scores/ranking to follow once results exist -- rather than
// fabricating numbers against no data.
export default function TableLeaderboard({ groupId, leagueKey }) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchGroupTablePredictions(groupId, leagueKey).then((data) => {
      if (!cancelled) {
        setEntries(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [groupId, leagueKey])

  if (loading) {
    return <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-8">{t('account.loading')}</p>
  }

  if (entries.length === 0) {
    return <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-8">{t('compete.noLockedPredictions')}</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-charcoal-600 dark:text-charcoal-300 text-center">{t('compete.tableLeaderboardPending')}</p>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div
            key={e.userId}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10"
          >
            <span className="text-sm text-charcoal-900 dark:text-sand truncate">{e.name || t('compete.unnamedMember')}</span>
            <span className="text-xs text-charcoal-600 dark:text-charcoal-300">{t('leagues.predictionsLocked')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
