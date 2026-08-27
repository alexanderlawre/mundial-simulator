import { useEffect, useMemo } from 'react'
import ClubBadge from '../leagues/ClubBadge'
import BracketTree from '../worldcup/BracketTree'
import { clubsByKey } from '../../data/leagues'
import { useTranslation } from '../../lib/i18n'
import {
  buildPlayoffPairs,
  initialPlayoffState,
  setPlayoffWinner,
  playoffComplete,
  getPlayoffWinners,
  buildKnockoutSkeleton,
  buildR16Pairs,
  buildInitialKnockoutState,
  buildAdvancesToMap,
  applyKnockoutResult,
  buildWinnerOnlyResult,
} from '../../lib/leagues/championsLeagueBracket'

function renderClubTeam(club, compact) {
  return (
    <>
      <ClubBadge club={club} size={compact ? 'sm' : 'md'} />
      <span className={`truncate text-charcoal-900 dark:text-sand ${compact ? 'text-xs' : 'text-sm'}`}>{club.name}</span>
    </>
  )
}

// order: the confirmed league-phase table (array of 36 club keys, index 0 =
// 1st place). matchState: { playoff, knockout } persisted bracket progress
// -- knockout stays null until every play-off pair has a winner, at which
// point it's auto-seeded from the top-8 auto-qualifiers + the 8 play-off
// winners. onChange receives the next { playoff, knockout } shape on every
// pick so the caller can persist it (localStorage + cloud sync), mirroring
// LeagueDragBoard's onConfirm callback split.
export default function ChampionsBracketBoard({ league, order, matchState, onChange }) {
  const { t } = useTranslation()
  const clubs = clubsByKey(league.key)
  const skeleton = useMemo(() => buildKnockoutSkeleton(), [])
  const advancesTo = useMemo(() => buildAdvancesToMap(skeleton), [skeleton])
  const playoffPairs = useMemo(() => buildPlayoffPairs(order), [order])
  const playoff = matchState?.playoff || initialPlayoffState(playoffPairs)
  const knockout = matchState?.knockout || null
  const complete = playoffComplete(playoff)

  // Once the last play-off pair gets a winner, seed the R16-onward bracket
  // and persist it immediately -- as an effect (not inline during render)
  // so this stays a pure side effect tied to React's commit phase, not a
  // render-time mutation.
  useEffect(() => {
    if (!complete || knockout) return
    const winners = getPlayoffWinners(playoff)
    const r16Pairs = buildR16Pairs(order, winners)
    onChange({ playoff, knockout: buildInitialKnockoutState(r16Pairs) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, knockout])

  function handlePlayoffPick(pairId, winnerKey) {
    onChange({ playoff: setPlayoffWinner(playoff, pairId, winnerKey), knockout })
  }

  function handleKnockoutPick(matchId, winnerName) {
    const data = knockout[matchId]
    const result = buildWinnerOnlyResult(data.teamA, data.teamB, winnerName)
    onChange({ playoff, knockout: applyKnockoutResult(skeleton, advancesTo, knockout, matchId, result) })
  }

  const finalRound = skeleton.rounds[skeleton.rounds.length - 1]
  const finalMatchId = `m${finalRound.roundIdx}-0`
  const championKey = knockout?.[finalMatchId]?.result?.winner
  const champion = championKey ? clubs[championKey] : null

  return (
    <div className="space-y-6">
      {champion && (
        <div
          className="rounded-2xl p-5 text-center text-white shadow-depth-lg"
          style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
        >
          <ClubBadge club={champion} size="lg" className="mx-auto mb-2" />
          <p className="font-display text-lg font-extrabold">{t('leagues.bracketChampion', { club: champion.name })}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
        <div className="px-4 py-3 bg-forest text-white font-display font-semibold">{t('leagues.playoffRound')}</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {playoffPairs.map(([teamAKey, teamBKey], i) => {
            const pairId = `p${i}`
            const winner = playoff[pairId]?.result?.winner
            return (
              <div key={pairId} className="rounded-xl border border-charcoal-900/10 dark:border-white/10 overflow-hidden">
                {[teamAKey, teamBKey].map((clubKey) => {
                  const club = clubs[clubKey]
                  const isWinner = winner === clubKey
                  return (
                    <button
                      key={clubKey}
                      type="button"
                      onClick={() => handlePlayoffPick(pairId, clubKey)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
                        ${isWinner ? 'bg-mint/60 font-bold' : 'hover:bg-sand dark:hover:bg-night'}`}
                    >
                      <ClubBadge club={club} size="sm" />
                      <span className="flex-1 truncate text-sm text-charcoal-900 dark:text-sand">{club?.name}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {complete && knockout && (
        <BracketTree
          skeleton={skeleton}
          matchState={knockout}
          teamsByName={clubs}
          interactive
          onEditMatch={handleKnockoutPick}
          renderTeam={renderClubTeam}
        />
      )}
    </div>
  )
}
