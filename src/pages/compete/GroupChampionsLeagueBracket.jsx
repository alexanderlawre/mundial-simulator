import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLeague } from '../../data/leagues'
import { fetchGroupTablePrediction, getGroupBracket, saveGroupBracket, syncGroupBracketToCloud, fetchGroupBracket } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import AppBackground from '../../components/common/AppBackground'
import ChampionsBracketBoard from '../../components/champions/ChampionsBracketBoard'
import SambaButton from '../../components/common/SambaButton'
import { useTranslation } from '../../lib/i18n'

const LEAGUE_KEY = 'champions-league'

// Group-scoped variant of ChampionsLeagueBracket.jsx: same board, but seeds
// from the group's confirmed table prediction (table_predictions) and
// persists bracket progress scoped to this group (group_brackets), so the
// same user can run an independent bracket per group -- mirrors
// GroupLeaguePredict.jsx's relationship to LeaguePredict.jsx.
export default function GroupChampionsLeagueBracket() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const league = getLeague(LEAGUE_KEY)
  const [prediction, setPrediction] = useState(null)
  const [matchState, setMatchState] = useState(() => getGroupBracket(groupId, LEAGUE_KEY))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !league) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetchGroupTablePrediction(user.id, groupId, LEAGUE_KEY).then((data) => {
      if (cancelled) return
      setPrediction(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, groupId, league])

  useEffect(() => {
    if (!user?.id) return
    fetchGroupBracket(user.id, groupId, LEAGUE_KEY).then((cloud) => {
      if (cloud) setMatchState(cloud)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, groupId])

  useEffect(() => {
    if (loading) return
    if (!league || !prediction?.confirmed) {
      navigate(`/compete/group/${groupId}/predict/${LEAGUE_KEY}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, league, prediction?.confirmed])

  if (loading) {
    return (
      <AppBackground>
        <p className="text-center text-charcoal-600 dark:text-charcoal-300 text-sm py-16">{t('account.loading')}</p>
      </AppBackground>
    )
  }

  if (!league || !prediction?.confirmed) return null

  function handleChange(next) {
    setMatchState(next)
    saveGroupBracket(groupId, LEAGUE_KEY, next)
    syncGroupBracketToCloud(user?.id, groupId, LEAGUE_KEY, next)
  }

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-5 mb-6 text-white shadow-depth-lg flex items-center justify-between gap-3"
          style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
        >
          <p className="font-display text-2xl font-extrabold">{league.name}</p>
          <SambaButton variant="outline" size="sm" onClick={() => navigate(`/compete/group/${groupId}/predict/${LEAGUE_KEY}`)}>
            {t('leagues.backToTable')}
          </SambaButton>
        </div>

        <ChampionsBracketBoard league={league} order={prediction.order} matchState={matchState} onChange={handleChange} />
      </div>
    </AppBackground>
  )
}
