import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { seedGroupDraw, buildTeam } from '../../lib/tournamentEngine'
import TeamBadge from '../../components/worldcup/TeamBadge'
import SambaButton from '../../components/common/SambaButton'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import { useTranslation } from '../../lib/i18n'

export default function GroupDraw() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { teamCount, teamNames, tournamentKey } = location.state || {}
  const teams = useMemo(() => (teamNames ? teamNames.map((n) => buildTeam(n)) : null), [teamNames])

  const groupCount = teamCount / 4
  const initialGroups = useMemo(
    // Random seed per mount -- every new tournament gets a fresh draw instead
    // of the same groups every time for a given team count.
    () => (teams ? seedGroupDraw(teams, groupCount, 'custom-draw-' + teamCount + '-' + Date.now() + '-' + Math.random()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [groups, setGroups] = useState(initialGroups)
  const [swapSelection, setSwapSelection] = useState(null) // { letter, index }

  if (!teams || !groups) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('play.noTeamSelection')}</p>
          <SambaButton onClick={() => navigate('/simulator/setup')}>{t('play.backToSetup')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  function handleTeamClick(letter, index) {
    if (!swapSelection) {
      setSwapSelection({ letter, index })
      return
    }
    if (swapSelection.letter === letter && swapSelection.index === index) {
      setSwapSelection(null)
      return
    }
    setGroups((prev) => {
      const next = { ...prev, [swapSelection.letter]: [...prev[swapSelection.letter]], [letter]: [...prev[letter]] }
      const a = next[swapSelection.letter][swapSelection.index]
      const b = next[letter][index]
      next[swapSelection.letter][swapSelection.index] = b
      next[letter][index] = a
      return next
    })
    setSwapSelection(null)
  }

  function reshuffle() {
    setGroups(seedGroupDraw(teams, groupCount, 'custom-draw-' + Math.random()))
    setSwapSelection(null)
  }

  function lockInAndSimulate() {
    const groupNames = {}
    Object.entries(groups).forEach(([letter, groupTeams]) => {
      groupNames[letter] = groupTeams.map((t) => t.name)
    })
    navigate('/simulator/play', { state: { teamCount, groupNames, tournamentKey } })
  }

  return (
    <AppBackground>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <NavBar title={t('play.drawTitle')} subtitle={t('play.drawSubtitle')} />
          </div>
          <div className="flex gap-2">
            <SambaButton variant="outline" size="sm" onClick={reshuffle}>{t('play.redraw')}</SambaButton>
            <SambaButton variant="primary" size="sm" onClick={lockInAndSimulate}>{t('play.lockInSimulate')}</SambaButton>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groups).map(([letter, groupTeams]) => (
            <div key={letter} className="rounded-2xl bg-white/80 dark:bg-night-card/80 shadow-depth p-3">
              <p className="font-display font-semibold text-charcoal-900 dark:text-sand mb-2">{t('play.group', { letter })}</p>
              <div className="space-y-2">
                {groupTeams.map((team, i) => (
                  <TeamBadge
                    key={team.name}
                    team={team}
                    size="sm"
                    selected={swapSelection?.letter === letter && swapSelection?.index === i}
                    onClick={() => handleTeamClick(letter, i)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
