import { useState } from 'react'
import CountryFlag from '../common/CountryFlag'
import SambaButton from '../common/SambaButton'
import ScoreEditForm from './ScoreEditForm'
import { useTranslation } from '../../lib/i18n'

function ScorerList({ scorers, align }) {
  const { t } = useTranslation()
  if (!scorers || scorers.length === 0) {
    return <p className={`text-xs text-charcoal-600/70 italic ${align === 'right' ? 'text-right' : ''}`}>{t('play.noGoals')}</p>
  }
  return (
    <ul className={`text-xs text-charcoal-600 space-y-0.5 ${align === 'right' ? 'text-right' : ''}`}>
      {scorers.map((s, i) => (
        <li key={i} className="tabular-nums">{s.name} {s.minute}&apos;</li>
      ))}
    </ul>
  )
}

function FifaCode({ team }) {
  if (!team?.fifaCode) return null
  return (
    <span translate="no" className="notranslate font-display text-[10px] font-bold tracking-widest text-charcoal-600 bg-charcoal-900/5 rounded px-1.5 py-0.5 w-10 text-center shrink-0 tabular-nums">
      {team.fifaCode}
    </span>
  )
}

function TeamMini({ team, align }) {
  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <CountryFlag nation={team} size="sm" />
      <FifaCode team={team} />
    </div>
  )
}

function TeamHero({ team, align }) {
  const { tn } = useTranslation()
  return (
    <div className={`flex flex-col items-center gap-2 flex-1 min-w-0 ${align === 'right' ? 'items-end' : 'items-start'} sm:items-center`}>
      <CountryFlag nation={team} size="lg" />
      <span className="font-display font-bold text-charcoal-900 dark:text-sand text-sm truncate max-w-full">{tn(team.name)}</span>
      <FifaCode team={team} />
    </div>
  )
}

// `onEdit(scoreA, scoreB, tiebreakWinner)` -- when supplied, an "Edit" toggle
// appears (regardless of variant) letting the user set/override the exact
// scoreline (and, for knockout matches, `requireWinner` forces a tiebreak
// pick on a level score, since knockouts can't stay drawn).
export default function MatchCard({ match, teamA, teamB, label, variant = 'default', onEdit, requireWinner = false }) {
  const { t, tn } = useTranslation()
  const [editing, setEditing] = useState(false)
  const editable = typeof onEdit === 'function'

  function handleSave(scoreA, scoreB, tiebreakWinner) {
    onEdit(scoreA, scoreB, tiebreakWinner)
    setEditing(false)
  }

  const editForm = editing && (
    <ScoreEditForm
      teamA={teamA}
      teamB={teamB}
      initialScoreA={match?.scoreA ?? 0}
      initialScoreB={match?.scoreB ?? 0}
      requireWinner={requireWinner}
      onSave={handleSave}
      onCancel={() => setEditing(false)}
    />
  )

  const editToggle = editable && !editing && (
    <SambaButton size="sm" variant="outline" onClick={() => setEditing(true)}>
      {match ? t('play.editResult') : t('play.setResult')}
    </SambaButton>
  )

  if (variant === 'compact') {
    return (
      <div className="rounded-xl bg-white/80 dark:bg-night-card/80 border border-charcoal-900/10 dark:border-white/10 shadow-depth px-3 py-2 space-y-2">
        {label && <p className="text-[9px] uppercase tracking-wide text-charcoal-600/60 font-semibold">{label}</p>}
        {editing ? editForm : (
          <>
            <div className="flex items-center justify-between gap-2">
              <TeamMini team={teamA} />
              {match ? (
                <div className="flex items-center justify-center shrink-0 px-1">
                  <div className="font-display font-extrabold text-base text-charcoal-900 dark:text-sand tabular-nums whitespace-nowrap">
                    {match.scoreA}&ndash;{match.scoreB}
                    {match.wentToPenalties && (
                      <span className="text-gold text-xs font-semibold"> ({match.penA}-{match.penB})</span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-charcoal-600 px-2">{t('play.vs')}</span>
              )}
              <TeamMini team={teamB} align="right" />
            </div>
            {editToggle && <div className="flex justify-center">{editToggle}</div>}
          </>
        )}
      </div>
    )
  }

  if (variant === 'final' || variant === 'bronze') {
    const isFinal = variant === 'final'
    return (
      <div
        className={`rounded-2xl p-5 shadow-depth-gold border-2 ${
          isFinal
            ? 'bg-gradient-to-br from-gold-light via-gold to-gold-light border-gold text-charcoal-900'
            : 'bg-gradient-to-br from-charcoal-600/20 via-white dark:via-night-card to-charcoal-600/10 border-charcoal-600/40'
        }`}
      >
        <p className={`text-center font-display font-extrabold uppercase tracking-widest mb-3 ${isFinal ? 'text-charcoal-900 text-sm' : 'text-charcoal-600 text-xs'}`}>
          {isFinal ? `\u2605 ${t('rounds.Final')} \u2605` : t('rounds.3rd Place Playoff', null, '3rd Place Playoff')}
        </p>
        {editing ? editForm : (
          <>
            <div className="flex items-center justify-between gap-3">
              <TeamHero team={teamA} />
              <span className="font-display text-xs uppercase tracking-widest px-2 shrink-0">{t('play.vs')}</span>
              <TeamHero team={teamB} align="right" />
            </div>
            {match && (
              <div className="flex items-center justify-center mt-4 pt-3 border-t border-charcoal-900/10 dark:border-white/10">
                <div className="font-display font-extrabold text-3xl tabular-nums">
                  {match.scoreA}&ndash;{match.scoreB}
                  {match.wentToPenalties && (
                    <span className="text-gold text-base font-semibold"> ({match.penA}-{match.penB})</span>
                  )}
                </div>
              </div>
            )}
            {editToggle && <div className="flex justify-center mt-3">{editToggle}</div>}
          </>
        )}
      </div>
    )
  }

  if (variant === 'hero') {
    return (
      <div className="rounded-2xl bg-white dark:bg-night-card border-2 border-gold/50 shadow-depth-gold p-5">
        <p className="text-[11px] uppercase tracking-wide text-gold mb-3 font-bold text-center">
          {label || t('play.upNext')}
        </p>
        {editing ? editForm : (
          <>
            <div className="flex items-center justify-between gap-3">
              <TeamHero team={teamA} />
              <span className="font-display text-charcoal-600 text-xs uppercase tracking-widest px-2 shrink-0">{t('play.vs')}</span>
              <TeamHero team={teamB} align="right" />
            </div>
            {editToggle && <div className="flex justify-center mt-3">{editToggle}</div>}
          </>
        )}
      </div>
    )
  }

  if (!match && !editable) {
    return (
      <div className="rounded-2xl bg-white/80 dark:bg-night-card/80 border border-charcoal-900/10 dark:border-white/10 shadow-depth p-4 flex items-center justify-between opacity-60">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CountryFlag nation={teamA} size="sm" />
          <span className="text-sm font-medium text-charcoal-600 dark:text-sand truncate">{tn(teamA.name)}</span>
        </div>
        <span className="font-display text-charcoal-600 dark:text-charcoal-300 text-sm px-2 shrink-0">{t('play.vs')}</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-medium text-charcoal-600 dark:text-sand truncate">{tn(teamB.name)}</span>
          <CountryFlag nation={teamB} size="sm" />
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="rounded-2xl bg-white/80 dark:bg-night-card/80 border border-charcoal-900/10 dark:border-white/10 shadow-depth p-4 space-y-3">
        {editing ? editForm : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CountryFlag nation={teamA} size="sm" />
                <span className="text-sm font-medium text-charcoal-600 dark:text-sand truncate">{tn(teamA.name)}</span>
              </div>
              <span className="font-display text-charcoal-600 dark:text-charcoal-300 text-sm px-2 shrink-0">{t('play.vs')}</span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="text-sm font-medium text-charcoal-600 dark:text-sand truncate">{tn(teamB.name)}</span>
                <CountryFlag nation={teamB} size="sm" />
              </div>
            </div>
            <div className="flex justify-center">{editToggle}</div>
          </>
        )}
      </div>
    )
  }

  const { scoreA, scoreB, scorersA, scorersB, wentToPenalties, penA, penB } = match

  return (
    <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth p-4 space-y-3">
      {label && <p className="text-[11px] uppercase tracking-wide text-charcoal-600 mb-2 font-semibold">{label}</p>}
      {editing ? editForm : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <CountryFlag nation={teamA} size="sm" />
              <FifaCode team={teamA} />
              <span className="font-display font-medium text-charcoal-900 dark:text-sand truncate">{tn(teamA.name)}</span>
            </div>

            <div className="flex items-center justify-center shrink-0 px-2">
              <div className="font-display font-extrabold text-2xl text-charcoal-900 dark:text-sand tabular-nums whitespace-nowrap">
                {scoreA} &ndash; {scoreB}
                {wentToPenalties && (
                  <span className="text-gold text-sm font-semibold"> ({penA}-{penB})</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="font-display font-medium text-charcoal-900 dark:text-sand truncate">{tn(teamB.name)}</span>
              <FifaCode team={teamB} />
              <CountryFlag nation={teamB} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-charcoal-900/10 dark:border-white/10">
            <ScorerList scorers={scorersA} />
            <ScorerList scorers={scorersB} align="right" />
          </div>
          {editToggle && <div className="flex justify-center">{editToggle}</div>}
        </>
      )}
    </div>
  )
}
