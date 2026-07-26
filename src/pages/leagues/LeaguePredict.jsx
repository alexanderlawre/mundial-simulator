import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLeague, clubsByKey } from '../../data/leagues'
import { getNation } from '../../data/nations'
import { getLeaguePrediction, saveLeaguePrediction, syncLeaguePredictionToCloud } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import AppBackground from '../../components/common/AppBackground'
import CountryFlag from '../../components/common/CountryFlag'
import LeagueDragBoard from '../../components/leagues/LeagueDragBoard'
import LeagueShareModal from '../../components/leagues/LeagueShareModal'
import PredictedTableView from '../../components/leagues/PredictedTableView'
import SambaButton from '../../components/common/SambaButton'
import GuestPrompt from '../../components/common/GuestPrompt'
import { useTranslation } from '../../lib/i18n'

// Zone key -> i18n key, in the display order the legend should render zones
// (top-of-table zones first, relegation last), independent of each
// league's own `zones` array order.
const ZONE_LABEL_ORDER = [
  ['ucl', 'leagues.zoneUcl'],
  ['uclQualifying', 'leagues.zoneUclQualifying'],
  ['uel', 'leagues.zoneUel'],
  ['uecl', 'leagues.zoneUecl'],
  ['libertadores', 'leagues.zoneLibertadores'],
  ['sudamericana', 'leagues.zoneSudamericana'],
  ['relegationPlayoff', 'leagues.zoneRelegationPlayoff'],
  ['relegation', 'leagues.zoneRelegation'],
]

function ZoneLegend({ league }) {
  const { t } = useTranslation()
  if (!league.zones?.length) return null
  const present = ZONE_LABEL_ORDER.filter(([key]) => league.zones.some((z) => z.key === key))
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
      {present.map(([key, labelKey]) => {
        const z = league.zones.find((zz) => zz.key === key)
        return (
          <span key={key} className="flex items-center gap-1.5 text-xs text-charcoal-600 dark:text-charcoal-300">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
            {t(labelKey)}
          </span>
        )
      })}
    </div>
  )
}

export default function LeaguePredict() {
  const { leagueKey } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const league = getLeague(leagueKey)
  const [prediction, setPrediction] = useState(() => (league ? getLeaguePrediction(league.key) : null))
  const [editing, setEditing] = useState(() => !prediction || !prediction.confirmed)
  const [showShare, setShowShare] = useState(false)
  const [guestPromptDismissed, setGuestPromptDismissed] = useState(false)

  if (!league) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('leagues.notFound')}</p>
          <SambaButton onClick={() => navigate('/leagues')}>{t('leagues.backToLeagues')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const nation = getNation(league.country)
  const clubs = clubsByKey(league.key)

  function handleConfirm(table) {
    saveLeaguePrediction(league.key, { order: table, confirmed: true })
    setPrediction({ order: table, confirmed: true })
    setEditing(false)
    syncLeaguePredictionToCloud(user?.id, league.key, { order: table, confirmed: true })
  }

  function handleEdit() {
    saveLeaguePrediction(league.key, { confirmed: false })
    setPrediction((p) => ({ ...p, confirmed: false }))
    setEditing(true)
  }

  // The drag board needs a wider stage on desktop so the unplaced-clubs
  // pool can sit as a side column next to the table instead of forcing a
  // long scroll down to the bottom every time; the locked/confirmed view
  // and header stay narrow and centered like the rest of the app.
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
                <p className="text-white/80 text-xs">{t('leagues.clubCount', { count: league.clubs.length })}</p>
              </div>
            </div>
          </div>

          {editing && <p className="text-sm text-charcoal-600 dark:text-charcoal-300 mb-4">{t('leagues.dragHint')}</p>}
          <ZoneLegend league={league} />
        </div>

        {editing ? (
          <LeagueDragBoard league={league} initialOrder={prediction?.order || null} onConfirm={handleConfirm} />
        ) : (
          <div className="space-y-5">
            <PredictedTableView league={league} order={prediction.order} />
            <div className="flex gap-2">
              <SambaButton variant="outline" className="flex-1" onClick={handleEdit}>
                {t('leagues.editPredictions')}
              </SambaButton>
              <SambaButton variant="gold" className="flex-1" onClick={() => setShowShare(true)}>
                {t('leagues.share')}
              </SambaButton>
            </div>
            {!user && !guestPromptDismissed && (
              <GuestPrompt onDismiss={() => setGuestPromptDismissed(true)} />
            )}
          </div>
        )}

        {showShare && (
          <LeagueShareModal
            league={league}
            order={prediction?.order}
            clubs={clubs}
            nation={nation}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </AppBackground>
  )
}
