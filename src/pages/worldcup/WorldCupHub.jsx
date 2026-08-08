import { useNavigate } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import { useTranslation } from '../../lib/i18n'

// World Cup's own two-mode hub, reached from the International Tournaments
// hub's "World Cup" card. "Create Your Own" is the existing 32/48/64-team
// simulator flow (SimulatorSetup.jsx onward, untouched); "Historic" is the
// existing real-World-Cup replay list (HistoricCups.jsx, untouched).
// Reuses existing i18n copy from both of those flows instead of adding new
// keys. Single stacked column, same pattern as the parent hub.
const MODES = [
  {
    key: 'create',
    titleKey: 'play.customTitle',
    descKey: 'tournaments.worldCupDesc',
    colors: { from: '#0A1428', to: '#1E3A8A' },
    path: '/simulator/setup',
  },
  {
    key: 'historic',
    titleKey: 'dashboard.historicTitle',
    descKey: 'dashboard.historicDesc',
    colors: { from: '#3E5C3A', to: '#D4AF37' },
    path: '/historic',
  },
]

export default function WorldCupHub() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('tournaments.worldCupName')} subtitle={t('tournaments.worldCupDesc')} />
        </div>
        <div className="flex flex-col gap-3">
          {MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => navigate(mode.path)}
              className="w-full text-left rounded-2xl shadow-depth-lg overflow-hidden hover:-translate-y-0.5 active:scale-[0.99] transition-all"
            >
              <div
                className="p-4 sm:p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${mode.colors.from}, ${mode.colors.to})` }}
              >
                <p className="font-display text-lg sm:text-xl font-extrabold">{t(mode.titleKey)}</p>
                <p className="text-white/80 text-xs sm:text-sm mt-1">{t(mode.descKey)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
