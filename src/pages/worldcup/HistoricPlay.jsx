import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getHistoricCup } from '../../data/historicWorldCups'
import { buildTeam, seedGroupDraw } from '../../lib/tournamentEngine'
import TournamentPlay from '../../components/worldcup/TournamentPlay'
import AppBackground from '../../components/common/AppBackground'
import SambaButton from '../../components/common/SambaButton'
import { getProfile } from '../../lib/storage'
import { useTranslation } from '../../lib/i18n'

function buildTeamsForCup(cup) {
  const ratingFor = (name) => cup.ratings?.[name] ?? cup.baseRating
  if (cup.groups) {
    const groups = {}
    Object.entries(cup.groups).forEach(([letter, names]) => {
      groups[letter] = names.map((n) => buildTeam(n, ratingFor(n)))
    })
    return { groups, knockoutOnlyTeams: null }
  }

  const teams = cup.teams.map((n) => buildTeam(n, ratingFor(n)))

  if (cup.format.pureKnockout) {
    // Pad to a power of two with a bye if the historical entry count is odd.
    const padded = [...teams]
    let target = 16
    while (target < padded.length) target *= 2
    while (padded.length < target) {
      padded.push({ name: 'BYE', rating: -999, confederation: 'UEFA', colors: ['#999999', '#cccccc'], isBye: true })
    }
    return { groups: null, knockoutOnlyTeams: padded }
  }

  const groups = seedGroupDraw(teams, cup.format.groupCount, `historic-${cup.year}`)
  return { groups, knockoutOnlyTeams: null }
}

export default function HistoricPlay() {
  const { year } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const profile = getProfile()
  const cup = getHistoricCup(year)
  const [runKey, setRunKey] = useState(0)
  const [built] = useState(() => (cup ? buildTeamsForCup(cup) : null))

  if (!cup) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('play.noHistoricCupFound', { year })}</p>
          <SambaButton onClick={() => navigate('/historic')}>{t('play.backToHistoricCups')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const format = {
    advancePerGroup: cup.format.advancePerGroup,
    bestThirds: cup.format.bestThirds || 0,
    has3rdPlace: cup.format.has3rdPlace,
  }

  return (
    <AppBackground>
      <TournamentPlay
        key={runKey}
        initialGroups={built.groups}
        knockoutOnlyTeams={built.knockoutOnlyTeams}
        format={format}
        title={t('play.historicCupTitle', { year: cup.year })}
        hostLabel={t('play.hostedBy', { host: cup.host })}
        userNation={profile?.supportedCountry}
        onRestart={() => setRunKey((k) => k + 1)}
        interactivity="simulateOnly"
        mode="historic"
        descriptor={cup.year}
      />
    </AppBackground>
  )
}
