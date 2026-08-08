import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TournamentPlay from '../../components/worldcup/TournamentPlay'
import AppBackground from '../../components/common/AppBackground'
import SambaButton from '../../components/common/SambaButton'
import { buildTeam } from '../../lib/tournamentEngine'
import { getProfile } from '../../lib/storage'
import { getTournamentConfig, tournamentI18nPrefix } from '../../data/internationalTournaments'
import { useTranslation } from '../../lib/i18n'

export default function SimulatorPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { teamCount, groupNames, tournamentKey } = location.state || {}
  const tournamentConfig = tournamentKey ? getTournamentConfig(tournamentKey) : null
  const groups = useMemo(() => {
    if (!groupNames) return null
    const result = {}
    Object.entries(groupNames).forEach(([letter, names]) => {
      result[letter] = names.map((n) => buildTeam(n))
    })
    return result
  }, [groupNames])
  const profile = getProfile()

  if (!groups) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('play.noTournamentInProgress')}</p>
          <SambaButton onClick={() => navigate('/simulator/setup')}>{t('play.backToSetup')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  // 48 teams (12 groups) uses the real FIFA Annex-C shape: top 2 plus the 8
  // best third-place teams fill the Round of 32. 32 and 64 teams (8 and 16
  // groups) both cleanly divide into a Round of 32/16 with just the top 2
  // per group -- no third-place ranking needed. Fixed-format international
  // tournaments (Euro/Copa América/AFCON/Asian Cup/Gold Cup) instead use
  // their own verified real-world format from internationalTournaments.js.
  const format = tournamentConfig
    ? tournamentConfig.format
    : teamCount === 48
      ? { advancePerGroup: 2, bestThirds: 8, has3rdPlace: true }
      : { advancePerGroup: 2, bestThirds: 0, has3rdPlace: true }

  const title = tournamentConfig
    ? t(`tournaments.${tournamentI18nPrefix(tournamentConfig.key)}Name`)
    : t('play.customWorldCupTitle', { count: teamCount })

  // descriptor is an opaque display value for history/analytics -- team
  // count for the World Cup (existing behavior, unchanged), tournament name
  // for the new fixed-format tournaments (Account.jsx/Admin.jsx already
  // treat it as an opaque string, not necessarily numeric).
  const descriptor = tournamentConfig ? title : teamCount

  return (
    <AppBackground>
      <TournamentPlay
        key={JSON.stringify(groups) /* fresh engine state per new draw */}
        initialGroups={groups}
        format={format}
        title={title}
        userNation={profile?.supportedCountry}
        onRestart={() => navigate(tournamentConfig ? '/tournaments' : '/simulator/setup')}
        interactivity="full"
        mode="custom"
        descriptor={descriptor}
      />
    </AppBackground>
  )
}
