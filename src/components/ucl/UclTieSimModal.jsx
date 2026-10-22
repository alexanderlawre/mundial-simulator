import { useEffect, useState } from 'react'
import ClubBadge from '../leagues/ClubBadge'
import SambaButton from '../common/SambaButton'
import { useTranslation } from '../../lib/i18n'
import { KO_ROUND_LABEL_KEY } from '../../lib/uclEngine'

function Scorers({ scorers, align }) {
  if (!scorers || scorers.length === 0) return <div />
  return (
    <ul className={`text-[11px] text-charcoal-600 dark:text-charcoal-300 space-y-0.5 ${align === 'right' ? 'text-right' : ''}`}>
      {scorers.map((s, i) => (
        <li key={i} className="tabular-nums">{s.name} {s.minute}&apos;</li>
      ))}
    </ul>
  )
}

// One match line: home | score | away, plus scorers. `state` drives the
// leg-by-leg reveal: hidden -> pending (pulsing "kick-off") -> revealed.
function MatchRow({ label, home, away, homeGoals, awayGoals, homeScorers, awayScorers, state }) {
  if (state === 'hidden') return null
  const revealed = state === 'revealed'
  return (
    <div className="rounded-xl bg-sand/60 dark:bg-night/60 p-3 animate-slide-up">
      <p className="text-center text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 mb-2">{label}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div className="flex flex-col items-center gap-1 text-center min-w-0">
          <ClubBadge club={home} size="md" />
          <span className="text-xs font-semibold text-charcoal-900 dark:text-sand truncate max-w-full">{home.name}</span>
        </div>
        <div className="pt-2 min-w-[4.5rem] text-center">
          {revealed ? (
            <span key="score" className="inline-block font-display font-extrabold text-3xl tabular-nums text-charcoal-900 dark:text-sand animate-pop-in">
              {homeGoals}&ndash;{awayGoals}
            </span>
          ) : (
            <span className="font-display font-extrabold text-3xl text-charcoal-600/50 animate-kickoff-pulse">?&ndash;?</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 text-center min-w-0">
          <ClubBadge club={away} size="md" />
          <span className="text-xs font-semibold text-charcoal-900 dark:text-sand truncate max-w-full">{away.name}</span>
        </div>
      </div>
      {revealed && (
        <div className="grid grid-cols-2 gap-3 mt-2 animate-slide-up">
          <Scorers scorers={homeScorers} />
          <Scorers scorers={awayScorers} align="right" />
        </div>
      )}
    </div>
  )
}

// Animated reveal of a freshly simulated tie: first leg, then second leg,
// then aggregate / extra time / penalties and the winner. The result is
// already decided; this just paces how it's shown. `onDone` commits it.
export default function UclTieSimModal({ tie, result, clubs, onDone }) {
  const { t } = useTranslation()
  const [stage, setStage] = useState(0)
  const isFinal = result.kind === 'final'

  useEffect(() => {
    if (stage >= 3) return undefined
    const id = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 1300 : 1700)
    return () => clearTimeout(id)
  }, [stage])

  const A = clubs[result.teamA]
  const B = clubs[result.teamB]
  const winner = clubs[result.winner]
  const rowState = (revealAt) => (stage >= revealAt ? 'revealed' : stage === revealAt - 1 ? 'pending' : 'hidden')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-night-card shadow-depth-lg p-5 space-y-3">
        <p className="text-center font-display font-bold text-forest dark:text-mint">{t(KO_ROUND_LABEL_KEY[tie.round])}</p>

        {isFinal ? (
          <>
            <MatchRow
              label={t('ucl.neutralVenue')}
              home={A}
              away={B}
              homeGoals={result.match.homeGoals}
              awayGoals={result.match.awayGoals}
              homeScorers={result.match.homeScorers}
              awayScorers={result.match.awayScorers}
              state={rowState(1)}
            />
            {result.et && (
              <MatchRow
                label={t('ucl.extraTime')}
                home={A}
                away={B}
                homeGoals={result.et.homeGoals}
                awayGoals={result.et.awayGoals}
                homeScorers={result.et.homeScorers}
                awayScorers={result.et.awayScorers}
                state={rowState(2)}
              />
            )}
          </>
        ) : (
          <>
            <MatchRow
              label={t('ucl.leg1')}
              home={A}
              away={B}
              homeGoals={result.leg1.homeGoals}
              awayGoals={result.leg1.awayGoals}
              homeScorers={result.leg1.homeScorers}
              awayScorers={result.leg1.awayScorers}
              state={rowState(1)}
            />
            <MatchRow
              label={t('ucl.leg2')}
              home={B}
              away={A}
              homeGoals={result.leg2.homeGoals}
              awayGoals={result.leg2.awayGoals}
              homeScorers={result.leg2.homeScorers}
              awayScorers={result.leg2.awayScorers}
              state={rowState(2)}
            />
          </>
        )}

        {stage >= 3 && (
          <div className="space-y-2 animate-slide-up">
            {!isFinal && (
              <p className="text-center text-sm text-charcoal-600 dark:text-charcoal-300">
                {t('ucl.aggregate')}: <span className="font-bold text-charcoal-900 dark:text-sand tabular-nums">{A.name} {result.aggA}&ndash;{result.aggB} {B.name}</span>
              </p>
            )}
            {!isFinal && result.et && (
              <p className="text-center text-xs text-gold font-semibold">
                {t('ucl.extraTime')}: {result.et.awayGoals}&ndash;{result.et.homeGoals}
              </p>
            )}
            {result.pens && (
              <p className="text-center text-sm text-gold font-semibold">{t('ucl.penaltyShootout', { a: result.pens.penA, b: result.pens.penB })}</p>
            )}
            <div className="flex items-center justify-center gap-3 rounded-xl bg-mint/60 dark:bg-emerald/25 py-3 animate-pop-in">
              <ClubBadge club={winner} size="lg" />
              <span className="font-display font-bold text-lg text-charcoal-900 dark:text-sand">
                {isFinal ? winner.name : t('ucl.advances', { club: winner.name })}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-1">
          {stage < 3 ? (
            <SambaButton variant="outline" size="sm" onClick={() => setStage(3)}>{t('ucl.skip')}</SambaButton>
          ) : (
            <SambaButton variant="gold" onClick={onDone}>{t('play.continue')}</SambaButton>
          )}
        </div>
      </div>
    </div>
  )
}
