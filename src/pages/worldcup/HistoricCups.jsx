import { useNavigate } from 'react-router-dom'
import { HISTORIC_WORLD_CUPS } from '../../data/historicWorldCups'
import AppBackground from '../../components/common/AppBackground'
import CountryFlag from '../../components/common/CountryFlag'
import NavBar from '../../components/common/NavBar'
import { useTranslation } from '../../lib/i18n'
import { buildTeam } from '../../lib/tournamentEngine'

export default function HistoricCups() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('dashboard.historicTitle')} subtitle={t('play.historicCupsSubtitle')} />
        </div>
        <div className="flex flex-col gap-3">
          {[...HISTORIC_WORLD_CUPS].sort((a, b) => b.year - a.year).map((cup) => (
            <button
              key={cup.year}
              onClick={() => navigate(`/historic/${cup.year}`)}
              className="w-full flex items-center gap-4 rounded-2xl bg-white dark:bg-night-card shadow-depth p-4 sm:p-5 text-left hover:-translate-y-0.5 active:scale-[0.99] transition-all"
            >
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-emerald shrink-0 w-16 sm:w-20">{cup.year}</p>
              <div className="min-w-0 flex-1">
                <p className="text-charcoal-900 dark:text-sand text-sm font-semibold truncate">{cup.host}</p>
                <p className="text-charcoal-600/70 dark:text-charcoal-300/70 text-xs mt-0.5 truncate">{t('play.teamsCountLabel', { count: cup.teamCount || Object.values(cup.groups || {}).flat().length })}</p>
              </div>
              {cup.winner && (
                <div className="flex items-center gap-2 shrink-0">
                  <CountryFlag nation={buildTeam(cup.winner)} size="sm" />
                  <span className="font-semibold text-gold text-sm">{cup.winner}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
