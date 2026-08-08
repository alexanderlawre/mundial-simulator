import { useNavigate } from 'react-router-dom'
import { LEAGUES, UPCOMING_COMPETITIONS } from '../../data/leagues'
import { getLeaguePrediction } from '../../lib/storage'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import LeagueCard from '../../components/leagues/LeagueCard'
import { useTranslation } from '../../lib/i18n'

export default function LeaguesHub() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('leagues.hubTitle')} subtitle={t('leagues.hubSubtitle')} />
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {LEAGUES.map((league) => (
            <LeagueCard
              key={league.key}
              league={league}
              prediction={getLeaguePrediction(league.key)}
              onClick={() => navigate(`/leagues/${league.key}`)}
            />
          ))}

          {UPCOMING_COMPETITIONS.map((competition) => (
            <div
              key={competition.key}
              className="text-left rounded-2xl shadow-depth-lg overflow-hidden opacity-60 cursor-not-allowed"
            >
              <div
                className="p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${competition.colors.from}, ${competition.colors.to})` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wide font-semibold bg-white/25 rounded-full px-2 py-0.5">
                    {t('leagues.comingSoon')}
                  </span>
                </div>
                <p className="font-display text-2xl font-extrabold">{competition.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
