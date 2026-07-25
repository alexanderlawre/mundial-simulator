import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLeague } from '../../data/leagues'
import { getNation } from '../../data/nations'
import { fetchGroupTablePrediction, syncGroupTablePrediction } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import AppBackground from '../../components/common/AppBackground'
import CountryFlag from '../../components/common/CountryFlag'
import LeagueDragBoard from '../../components/leagues/LeagueDragBoard'
import PredictedTableView from '../../components/leagues/PredictedTableView'
import SambaButton from '../../components/common/SambaButton'
import { useTranslation } from '../../lib/i18n'

// Group-scoped variant of LeaguePredict.jsx: same LeagueDragBoard /
// PredictedTableView, but persists to the group-scoped `table_predictions`
// table (via syncGroupTablePrediction/fetchGroupTablePrediction) instead
// of the ungrouped solo `league_predictions` table, so the same user can
// lock in a different table call per group. Unlike the solo flow, there
// is intentionally no "Edit predictions" button once locked -- per spec,
// preseason table calls cannot be re-predicted mid-season.
export default function GroupLeaguePredict() {
  const { groupId, leagueKey } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const league = getLeague(leagueKey)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(true)

  useEffect(() => {
    if (!user?.id || !league) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchGroupTablePrediction(user.id, groupId, league.key).then((data) => {
      if (cancelled) return
      setPrediction(data)
      setEditing(!data || !data.confirmed)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, groupId, league?.key])

  if (!league) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">League not found.</p>
          <SambaButton onClick={() => navigate(`/compete/group/${groupId}`)}>{t('common.back')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const nation = getNation(league.country)

  async function handleConfirm(table) {
    const state = { order: table, confirmed: true }
    setPrediction(state)
    setEditing(false)
    await syncGroupTablePrediction(user?.id, groupId, league.key, state)
  }

  if (loading) {
    return (
      <AppBackground>
        <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-16">{t('account.loading')}</p>
      </AppBackground>
    )
  }

  return (
    <AppBackground>
      <div className={`mx-auto px-4 py-8 ${editing ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <div className={editing ? 'max-w-2xl' : ''}>
          <div
            className="rounded-2xl p-5 mb-6 text-white shadow-depth-lg"
            style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
          >
            <div className="flex items-center gap-3">
              <CountryFlag nation={nation} size="lg" />
              <div>
                <p className="font-display text-2xl font-extrabold">{league.name}</p>
                <p className="text-white/80 text-xs">{t('compete.groupPredictionSubtitle')}</p>
              </div>
            </div>
          </div>
          {editing && <p className="text-sm text-charcoal-600 dark:text-charcoal-300 mb-4">{t('leagues.dragHint')}</p>}
        </div>

        {editing ? (
          <LeagueDragBoard league={league} initialOrder={prediction?.order || null} onConfirm={handleConfirm} />
        ) : (
          <div className="space-y-5">
            <PredictedTableView league={league} order={prediction.order} />
            <p className="text-xs text-center text-charcoal-600 dark:text-charcoal-300">{t('compete.tablePredictionLocked')}</p>
            <SambaButton variant="outline" className="w-full" onClick={() => navigate(`/compete/group/${groupId}`)}>
              {t('common.back')}
            </SambaButton>
          </div>
        )}
      </div>
    </AppBackground>
  )
}
