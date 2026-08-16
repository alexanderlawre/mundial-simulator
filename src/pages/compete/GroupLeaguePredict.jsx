import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLeague } from '../../data/leagues'
import { getNation } from '../../data/nations'
import { fetchGroupTablePrediction, syncGroupTablePrediction } from '../../lib/storage'
import { predictionsLocked, PREDICTIONS_LOCK_AT } from '../../lib/predictionsLock'
import { useAuth } from '../../lib/AuthContext'
import AppBackground from '../../components/common/AppBackground'
import CountryFlag from '../../components/common/CountryFlag'
import LeagueDragBoard from '../../components/leagues/LeagueDragBoard'
import PredictedTableView from '../../components/leagues/PredictedTableView'
import SambaButton from '../../components/common/SambaButton'
import { useTranslation } from '../../lib/i18n'

const UNLOCK_LABEL = PREDICTIONS_LOCK_AT.toLocaleString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
})

// Group-scoped variant of LeaguePredict.jsx: same LeagueDragBoard /
// PredictedTableView, but persists to the group-scoped `table_predictions`
// table (via syncGroupTablePrediction/fetchGroupTablePrediction) instead
// of the ungrouped solo `league_predictions` table, so the same user can
// lock in a different table call per group. Mirrors the solo flow's
// edit-until-the-deadline behavior: confirming just flips `locked` on the
// row (so it's excluded from the group's Table leaderboard, which only
// reads locked=true rows) -- it's freely re-editable up until the real
// prediction-lock deadline (see predictionsLock.js), not a one-time,
// irreversible confirm.
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
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('leagues.notFound')}</p>
          <SambaButton onClick={() => navigate(`/compete/group/${groupId}`)}>{t('common.back')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const nation = getNation(league.country)
  const locked = predictionsLocked()

  async function handleConfirm(table) {
    if (locked) return
    const state = { order: table, confirmed: true }
    setPrediction(state)
    setEditing(false)
    await syncGroupTablePrediction(user?.id, groupId, league.key, state)
  }

  // Re-opens the drag board on an already-confirmed table, same as
  // LeaguePredict.jsx's handleEdit. Also flips `locked` back to false on
  // the server row so a table mid-edit drops out of the group's Table
  // leaderboard (which only reads locked=true rows) until re-confirmed --
  // never blocked before the real deadline.
  async function handleEdit() {
    if (locked) return
    setPrediction((p) => ({ ...p, confirmed: false }))
    setEditing(true)
    if (prediction?.order) {
      await syncGroupTablePrediction(user?.id, groupId, league.key, { order: prediction.order, confirmed: false })
    }
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

        {editing && locked ? (
          <p className="text-center text-sm text-charcoal-600 dark:text-charcoal-300 py-8">{t('profile.locked', { date: UNLOCK_LABEL })}</p>
        ) : editing ? (
          <LeagueDragBoard league={league} initialOrder={prediction?.order || null} onConfirm={handleConfirm} />
        ) : (
          <div className="space-y-5">
            <PredictedTableView league={league} order={prediction.order} />
            {locked && <p className="text-xs text-center text-charcoal-600 dark:text-charcoal-300">{t('compete.tablePredictionLocked')}</p>}
            <div className="flex gap-2">
              {!locked && (
                <SambaButton variant="outline" className="flex-1" onClick={handleEdit}>
                  {t('leagues.editPredictions')}
                </SambaButton>
              )}
              <SambaButton variant={locked ? 'outline' : 'gold'} className="flex-1" onClick={() => navigate(`/compete/group/${groupId}`)}>
                {t('common.back')}
              </SambaButton>
            </div>
          </div>
        )}
      </div>
    </AppBackground>
  )
}
