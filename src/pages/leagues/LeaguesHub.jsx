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
        <div className="flex flex-col gap-3">
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
              className="w-full rounded-2xl shadow-depth-lg overflow-hidden opacity-60 cursor-not-allowed"
            >
              <div
                className="flex items-center justify-between gap-3 flex-wrap p-4 sm:p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${competition.colors.from}, ${competition.colors.to})` }}
              >
                <p className="font-display text-lg sm:text-xl font-extrabold">{competition.name}</p>
                <span className="text-[10px] uppercase tracking-wide font-semibold bg-white/25 rounded-full px-2 py-0.5 shrink-0">
                  {t('leagues.comingSoon')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
