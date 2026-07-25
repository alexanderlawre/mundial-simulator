import { useNavigate } from 'react-router-dom'
import { HISTORIC_WORLD_CUPS } from '../../data/historicWorldCups'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'

export default function HistoricCups() {
  const navigate = useNavigate()
  return (
    <AppBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <NavBar title="Historic World Cups" subtitle="Replay any tournament from 1930 to 2026 with its real host and qualified teams." />
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
              <p className="text-charcoal-600/70 text-xs mt-1">{cup.teamCount || Object.values(cup.groups || {}).flat().length} teams</p>
              {cup.winner && (
                <p className="text-charcoal-600/70 text-xs mt-2">
                  <span className="font-semibold text-gold">{cup.winner}</span> d. {cup.runnerUp}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </AppBackground>
  )
}
