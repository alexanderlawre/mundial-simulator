import { useNavigate } from 'react-router-dom'
import { INTERNATIONAL_TOURNAMENTS, tournamentI18nPrefix } from '../../data/internationalTournaments'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import { useTranslation } from '../../lib/i18n'

// World Cup card colors -- kept here rather than in internationalTournaments.js
// since the World Cup itself isn't part of that config (it has its own
// two-mode hub -- Create Your Own vs Historic -- at /world-cup instead of a
// single config entry here).
const WORLD_CUP_COLORS = { from: '#0A1428', to: '#1E3A8A' }

// Landing page for every simulate-able international tournament. World Cup
// always leads, now routing to its own /world-cup hub (Create Your Own +
// Historic, see WorldCupHub.jsx) rather than straight into the team-count
// picker; the five new tournaments follow in the exact order specified by
// the product requirement (Euro, Copa América, AFCON, Asian Cup, Gold
// Cup), each passing `tournamentKey` through router state so
// /simulator/setup, /simulator/draw and /simulator/play can branch off the
// World Cup's hardcoded team-count flow without altering it. Rendered as a
// single stacked column (not a grid) so cards read top-to-bottom and stay
// comfortably tappable on narrow phone widths.
export default function InternationalTournamentsHub() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const cards = [
    {
      key: 'world-cup',
      name: t('tournaments.worldCupName'),
      desc: t('tournaments.worldCupDesc'),
      colors: WORLD_CUP_COLORS,
      onClick: () => navigate('/world-cup'),
    },
    ...INTERNATIONAL_TOURNAMENTS.slice()
      .sort((a, b) => a.order - b.order)
      .map((cfg) => ({
        key: cfg.key,
        name: t(`tournaments.${tournamentI18nPrefix(cfg.key)}Name`),
        desc: t(`tournaments.${tournamentI18nPrefix(cfg.key)}Desc`),
        colors: cfg.colors,
        onClick: () => navigate('/simulator/setup', { state: { tournamentKey: cfg.key } }),
      })),
  ]

  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title={t('tournaments.hubTitle')} subtitle={t('tournaments.hubSubtitle')} />
        </div>
        <div className="flex flex-col gap-3">
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={card.onClick}
              className="w-full text-left rounded-2xl shadow-depth-lg overflow-hidden hover:-translate-y-0.5 active:scale-[0.99] transition-all"
            >
              <div
                className="p-4 sm:p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${card.colors.from}, ${card.colors.to})` }}
              >
                <p className="font-display text-lg sm:text-xl font-extrabold">{card.name}</p>
                <p className="text-white/80 text-xs sm:text-sm mt-1">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
