import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLeague, clubsByKey } from '../data/leagues'
import { getNation } from '../data/nations'
import { getLeaguePrediction, saveLeaguePrediction } from '../lib/storage'
import AppBackground from '../components/AppBackground'
import CountryFlag from '../components/CountryFlag'
import ClubBadge from '../components/leagues/ClubBadge'
import LeagueDragBoard from '../components/leagues/LeagueDragBoard'
import LeagueShareModal from '../components/leagues/LeagueShareModal'
import SambaButton from '../components/SambaButton'
import { useTranslation } from '../lib/i18n'

// Simple, non-interactive numbered row for the locked/confirmed view --
// deliberately a separate, drag-free markup from LeagueTableSlot (rather
// than reusing it with drag disabled) so the confirmed view can mount with
// zero dnd-kit wiring and zero accidental-drag risk.
function LockedRow({ index, club, accent, relegation, europe }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-white/90 dark:bg-night-card/90 border border-charcoal-900/10 dark:border-white/10
        ${relegation ? 'border-l-4 border-l-red-500/70' : ''} ${europe ? 'border-l-4 border-l-emerald' : ''}`}
    >
      <span className="w-6 text-center font-display font-bold text-sm text-charcoal-600 dark:text-charcoal-300 tabular-nums shrink-0">
        {index + 1}
      </span>
      <ClubBadge club={club} size="sm" accent={accent} />
      <span className="flex-1 min-w-0 truncate font-medium text-charcoal-900 dark:text-sand text-sm">{club.name}</span>
    </div>
  )
}

export default function LeaguePredict() {
  const { leagueKey } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const league = getLeague(leagueKey)
  const [prediction, setPrediction] = useState(() => (league ? getLeaguePrediction(league.key) : null))
  const [editing, setEditing] = useState(() => !prediction || !prediction.confirmed)
  const [showShare, setShowShare] = useState(false)

  if (!league) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">League not found.</p>
          <SambaButton onClick={() => navigate('/leagues')}>Back to Leagues</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const nation = getNation(league.country)
  const clubs = clubsByKey(league.key)

  function handleConfirm(table) {
    saveLeaguePrediction(league.key, { order: table, confirmed: true })
    setPrediction({ order: table, confirmed: true })
    setEditing(false)
  }

  function handleEdit() {
    saveLeaguePrediction(league.key, { confirmed: false })
    setPrediction((p) => ({ ...p, confirmed: false }))
    setEditing(true)
  }

  // The drag board needs a wider stage on desktop so the unplaced-clubs
  // pool can sit as a side column next to the table instead of forcing a
  // long scroll down to the bottom every time; the locked/confirmed view
  // and header stay narrow and centered like the rest of the app.
  return (
    <AppBackground>
      <div className={`mx-auto px-4 py-8 ${editing ? 'max-w-5xl' : 'max-w-2xl'}`}>
        <div className={editing ? 'max-w-2xl' : ''}>
          <div
            className="rounded-2xl p-5 mb-6 text-white shadow-depth-lg"
            style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
          >
            <div className="flex items-center gap-3">
              <CountryFlag nation={nation} size="lg" />
              <div>
                <p className="font-display text-2xl font-extrabold">{league.name}</p>
                <p className="text-white/80 text-xs">{t('leagues.clubCount', { count: league.clubs.length })}</p>
              </div>
            </div>
          </div>

          {editing && <p className="text-sm text-charcoal-600 dark:text-charcoal-300 mb-4">{t('leagues.dragHint')}</p>}
        </div>

        {editing ? (
          <LeagueDragBoard league={league} initialOrder={prediction?.order || null} onConfirm={handleConfirm} />
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              {prediction.order.map((clubKey, i) => (
                <LockedRow
                  key={clubKey}
                  index={i}
                  club={clubs[clubKey]}
                  accent={league.colors.accent}
                  europe={i < 4}
                  relegation={i >= league.clubs.length - 3}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <SambaButton variant="outline" className="flex-1" onClick={handleEdit}>
                {t('leagues.editPredictions')}
              </SambaButton>
              <SambaButton variant="gold" className="flex-1" onClick={() => setShowShare(true)}>
                {t('leagues.share')}
              </SambaButton>
            </div>
          </div>
        )}

        {showShare && (
          <LeagueShareModal
            league={league}
            order={prediction?.order}
            clubs={clubs}
            nation={nation}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </AppBackground>
  )
}
