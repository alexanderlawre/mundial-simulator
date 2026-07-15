import { useNavigate } from 'react-router-dom'
import { LEAGUES, UPCOMING_COMPETITIONS, clubsByKey } from '../data/leagues'
import { getLeaguePrediction } from '../lib/storage'
import { getNation } from '../data/nations'
import CountryFlag from '../components/CountryFlag'
import AppBackground from '../components/AppBackground'
import NavBar from '../components/NavBar'
import ClubBadge from '../components/leagues/ClubBadge'
import { useTranslation } from '../lib/i18n'

// Small row of up to 3 mini badges previewing the user's current top picks
// for a league -- shown on both the Leagues Hub and (reused) the Account
// page's "Submitted Tables" cards. Renders nothing if nothing's placed yet,
// so it's a no-op visually for a league the user hasn't touched.
export function TopPicksPreview({ league, order }) {
  if (!order?.[0]) return null
  const clubs = clubsByKey(league.key)
  const topThree = order.slice(0, 3).filter(Boolean)
  return (
    <div className="flex items-center -space-x-2 mt-2">
      {topThree.map((clubKey) => {
        const club = clubs[clubKey]
        if (!club) return null
        return (
          <span key={clubKey} className="rounded-full ring-2 ring-white/80 dark:ring-night-card bg-white/10">
            <ClubBadge club={club} size="xs" />
          </span>
        )
      })}
    </div>
  )
}

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
          {LEAGUES.map((league) => {
            const prediction = getLeaguePrediction(league.key)
            const nation = getNation(league.country)
            return (
              <button
                key={league.key}
                onClick={() => navigate(`/leagues/${league.key}`)}
                className="text-left rounded-2xl shadow-depth-lg overflow-hidden hover:-translate-y-1 active:scale-[0.98] transition-all"
              >
                <div
                  className="p-5 text-white"
                  style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CountryFlag nation={nation} size="sm" />
                    {prediction?.confirmed ? (
                      <span className="text-[10px] uppercase tracking-wide font-semibold bg-white/25 rounded-full px-2 py-0.5">
                        {t('leagues.predictionsLocked')}
                      </span>
                    ) : prediction ? (
                      <span className="text-[10px] uppercase tracking-wide font-semibold bg-white/25 rounded-full px-2 py-0.5">
                        {t('leagues.inProgress')}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-display text-2xl font-extrabold">{league.name}</p>
                  <p className="text-white/80 text-xs mt-1">{t('leagues.clubCount', { count: league.clubs.length })}</p>
                  <TopPicksPreview league={league} order={prediction?.order} />
                </div>
              </button>
            )
          })}

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
