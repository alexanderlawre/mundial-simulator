import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeague } from '../../data/leagues'
import { getLeaguePrediction, getBracket, saveBracket, syncBracketToCloud } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import AppBackground from '../../components/common/AppBackground'
import ChampionsBracketBoard from '../../components/champions/ChampionsBracketBoard'
import SambaButton from '../../components/common/SambaButton'
import { useTranslation } from '../../lib/i18n'

const LEAGUE_KEY = 'champions-league'

// Solo Champions League bracket -- reached from LeaguePredict.jsx's
// "Continue to Knockout Bracket" button once the 36-club table is
// confirmed. Redirects back there if that hasn't happened yet, since the
// bracket's play-off seeding needs a finished table to seed from.
export default function ChampionsLeagueBracket() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const league = getLeague(LEAGUE_KEY)
  const prediction = league ? getLeaguePrediction(LEAGUE_KEY) : null
  const [matchState, setMatchState] = useState(() => getBracket(LEAGUE_KEY))

  useEffect(() => {
    if (!league || !prediction?.confirmed) {
      navigate(`/leagues/${LEAGUE_KEY}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league, prediction?.confirmed])

  if (!league || !prediction?.confirmed) return null

  function handleChange(next) {
    setMatchState(next)
    saveBracket(LEAGUE_KEY, next)
    syncBracketToCloud(user?.id, LEAGUE_KEY, next)
  }

  return (
    <AppBackground>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-5 mb-6 text-white shadow-depth-lg flex items-center justify-between gap-3"
          style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
        >
          <p className="font-display text-2xl font-extrabold">{league.name}</p>
          <SambaButton variant="outline" size="sm" onClick={() => navigate(`/leagues/${LEAGUE_KEY}`)}>
            {t('leagues.backToTable')}
          </SambaButton>
        </div>

        <ChampionsBracketBoard league={league} order={prediction.order} matchState={matchState} onChange={handleChange} />
      </div>
    </AppBackground>
  )
}
