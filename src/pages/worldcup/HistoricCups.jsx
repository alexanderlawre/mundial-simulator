import { useNavigate } from 'react-router-dom'
import { HISTORIC_WORLD_CUPS } from '../../data/historicWorldCups'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import { useTranslation } from '../../lib/i18n'

export default function HistoricCups() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('dashboard.historicTitle')} subtitle={t('play.historicCupsSubtitle')} />
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...HISTORIC_WORLD_CUPS].sort((a, b) => b.year - a.year).map((cup) => (
            <button
              key={cup.year}
              onClick={() => navigate(`/historic/${cup.year}`)}
              className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-5 text-left hover:-translate-y-1 active:scale-[0.98] transition-all"
            >
              <p className="font-display text-3xl font-extrabold text-emerald">{cup.year}</p>
              <p className="text-charcoal-600 dark:text-charcoal-300 text-sm mt-1">{cup.host}</p>
              <p className="text-charcoal-600/70 text-xs mt-1">{t('play.teamsCountLabel', { count: cup.teamCount || Object.values(cup.groups || {}).flat().length })}</p>
              {cup.winner && (
                <p className="text-charcoal-600/70 text-xs mt-2">
                  {t('play.winnerPrefix')}<span className="font-semibold text-gold">{cup.winner}</span>
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
