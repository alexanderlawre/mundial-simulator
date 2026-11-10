import { useState } from 'react'
import ClubBadge from '../leagues/ClubBadge'
import { useTranslation } from '../../lib/i18n'
import { KO_ROUND_LABEL_KEY, pathForClub, tieIsReady } from '../../lib/uclEngine'

const ROUND_COLUMNS = ['playoff', 'r16', 'qf', 'sf', 'final']
const ROW_SPAN = { playoff: 1, r16: 1, qf: 2, sf: 4, final: 8 }

// Per-club numbers for a finished tie, from that club's own point of view:
// [leg1 goals, leg2 goals, aggregate] (two-legged) or [goals] (final).
function scoreCells(result, clubKey) {
  if (!result) return null
  if (result.kind === 'final') return [clubKey === result.teamA ? result.goalsA : result.goalsB]
  const l1 = clubKey === result.teamA ? result.leg1.homeGoals : result.leg1.awayGoals
  const l2 = clubKey === result.teamB ? result.leg2.homeGoals : result.leg2.awayGoals
  const agg = clubKey === result.teamA ? result.aggA : result.aggB
  return [l1, l2, agg]
}

function Slot({ club, placeholder, result, isWinner, selected, onSelect }) {
  const cells = club ? scoreCells(result, club.key) : null
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 min-h-[34px] ${isWinner ? 'bg-mint/60 dark:bg-emerald/25' : ''} ${
        result && !isWinner ? 'opacity-60' : ''
      }`}
    >
      {club ? (
        <button
          type="button"
          onClick={() => onSelect?.(club.key)}
          className={`flex items-center gap-1.5 flex-1 min-w-0 text-left rounded ${selected ? 'ring-2 ring-gold' : ''}`}
        >
          <ClubBadge club={club} size="xs" />
          <span className={`truncate text-xs ${isWinner ? 'font-bold' : 'font-medium'} text-charcoal-900 dark:text-sand`}>{club.name}</span>
        </button>
      ) : (
        <span className="flex-1 min-w-0 text-xs italic text-charcoal-600/70 dark:text-charcoal-300/70 truncate">{placeholder}</span>
      )}
      {cells && (
        <span className="flex items-center gap-1 tabular-nums shrink-0">
          {cells.length === 1 ? (
            <span className="w-5 text-center text-xs font-bold text-charcoal-900 dark:text-sand">{cells[0]}</span>
          ) : (
            <>
              <span className="w-4 text-center text-[11px] text-charcoal-600 dark:text-charcoal-300">{cells[0]}</span>
              <span className="w-4 text-center text-[11px] text-charcoal-600 dark:text-charcoal-300">{cells[1]}</span>
              <span className="w-5 text-center text-xs font-bold text-charcoal-900 dark:text-sand">{cells[2]}</span>
            </>
          )}
        </span>
      )}
    </div>
  )
}

function FeederPlaceholder({ feeder, clubs, drawn }) {
  const { t } = useTranslation()
  if (!feeder || !drawn || !feeder.a || !feeder.b) return t('play.tbd')
  const a = clubs[feeder.a]
  const b = clubs[feeder.b]
  return (
    <span className="inline-flex items-center gap-1">
      <ClubBadge club={a} size="xs" />
      <span>/</span>
      <ClubBadge club={b} size="xs" />
    </span>
  )
}

// Full knockout bracket (play-offs -> final) laid out on an 8-row grid so
// every play-off tie sits directly beside the Round of 16 tie it feeds.
// `drawnTieIds` (a Set) limits which play-off ties are revealed -- used by
// the interactive knockout draw; pass null to show everything.
export default function UclBracketView({
  bracket,
  clubs,
  selectedClub = null,
  onSelectClub,
  drawnTieIds = null,
  nextTieId = null,
  busyTieId = null,
  onSimulate,
  onPickWinner,
}) {
  const { t } = useTranslation()
  const [choosingId, setChoosingId] = useState(null)
  const pathIds = selectedClub ? new Set(pathForClub(bracket, selectedClub)) : null

  // R16 slot index -> the play-off tie that feeds it.
  const feederOf = {}
  Object.entries(bracket.advancesTo).forEach(([from, to]) => {
    if (bracket.ties[from].round === 'playoff') feederOf[to.id] = from
  })

  const columns = {
    playoff: bracket.r16Ids.map((r16Id) => feederOf[r16Id]),
    r16: bracket.r16Ids,
    qf: bracket.qfIds,
    sf: bracket.sfIds,
    final: ['final'],
  }

  function renderTie(id) {
    const tie = bracket.ties[id]
    const isPlayoff = tie.round === 'playoff'
    const drawn = !isPlayoff || !drawnTieIds || drawnTieIds.has(id)
    const a = drawn && tie.a ? clubs[tie.a] : null
    const b = drawn && tie.b ? clubs[tie.b] : null
    const winner = tie.result?.winner || null
    const inPath = pathIds ? pathIds.has(id) : false
    const dim = pathIds && !inPath
    const ready = onSimulate && tieIsReady(tie) && !busyTieId
    const isNext = nextTieId === id
    const feeder = bracket.ties[feederOf[id]]
    const feederDrawn = feeder ? !drawnTieIds || drawnTieIds.has(feeder.id) : false
    const placeholder = (slot) => {
      if (isPlayoff) return tie.group ? `${t('ucl.playoffTieLabel', { id: tie.id.replace('po-', '') })}` : t('play.tbd')
      if (tie.round === 'r16' && slot === 'b') return <FeederPlaceholder feeder={feeder} clubs={clubs} drawn={feederDrawn} />
      return t('play.tbd')
    }
    const pens = tie.result?.pens
    return (
      <div
        key={id}
        className={`w-full rounded-xl overflow-hidden bg-white dark:bg-night-card border shadow-depth transition-all ${
          inPath ? 'border-gold ring-2 ring-gold/70' : 'border-charcoal-900/10 dark:border-white/10'
        } ${dim ? 'opacity-45' : ''} ${busyTieId === id ? 'animate-kickoff-pulse' : ''} ${tie.round === 'final' ? 'shadow-depth-gold' : ''}`}
      >
        <Slot club={a} placeholder={placeholder('a')} result={tie.result} isWinner={winner && a && winner === a.key} selected={selectedClub === tie.a} onSelect={onSelectClub} />
        <div className="h-px bg-charcoal-900/10 dark:bg-white/10" />
        <Slot club={b} placeholder={placeholder('b')} result={tie.result} isWinner={winner && b && winner === b.key} selected={selectedClub === tie.b} onSelect={onSelectClub} />
        {(tie.result?.et || pens) && (
          <p className="px-2 py-0.5 text-[10px] text-gold font-semibold bg-charcoal-900/5 dark:bg-white/5">
            {tie.result.et ? t('ucl.extraTime') : ''}
            {tie.result.et && pens ? ' · ' : ''}
            {pens ? t('ucl.penaltyShootout', { a: pens.penA, b: pens.penB }) : ''}
          </p>
        )}
        {ready && choosingId === id && onPickWinner && (
          <div className="p-1.5 space-y-1 bg-charcoal-900/5 dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 text-center">{t('ucl.whoAdvances')}</p>
            {[a, b].map((club) => (
              <button
                key={club.key}
                type="button"
                onClick={() => {
                  setChoosingId(null)
                  onPickWinner(id, club.key)
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg bg-mint text-emerald text-xs font-display font-semibold hover:bg-mint/80"
              >
                <ClubBadge club={club} size="xs" />
                <span className="truncate">{club.name}</span>
              </button>
            ))}
            <button type="button" onClick={() => setChoosingId(null)} className="w-full text-[11px] text-charcoal-600 dark:text-charcoal-300 hover:underline">
              {t('play.cancel')}
            </button>
          </div>
        )}
        {ready && choosingId !== id && (
          <div className="flex">
            <button
              type="button"
              onClick={() => onSimulate(id)}
              className={`flex-1 py-1.5 text-xs font-display font-semibold transition-colors ${
                isNext
                  ? 'bg-gradient-to-r from-gold to-gold-light text-charcoal-900'
                  : 'bg-mint text-emerald hover:bg-mint/80'
              }`}
            >
              {tie.round === 'final' ? t('ucl.simulateFinal') : t('ucl.simulateTie')}
            </button>
            {onPickWinner && (
              <button
                type="button"
                onClick={() => setChoosingId(id)}
                className="px-2.5 py-1.5 text-xs font-display font-semibold border-l border-charcoal-900/10 dark:border-white/10 bg-white dark:bg-night-card text-charcoal-900 dark:text-sand hover:bg-sand dark:hover:bg-night"
              >
                {t('ucl.chooseWinner')}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="min-w-[56rem]">
        <div className="grid grid-cols-5 gap-3 mb-2">
          {ROUND_COLUMNS.map((r) => (
            <p key={r} className="text-center text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300">
              {t(KO_ROUND_LABEL_KEY[r])}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-x-3 gap-y-2" style={{ gridTemplateRows: 'repeat(8, auto)' }}>
          {ROUND_COLUMNS.map((round, col) =>
            columns[round].map((id, i) => (
              <div
                key={id}
                className="flex items-center"
                style={{ gridColumn: col + 1, gridRow: `${i * ROW_SPAN[round] + 1} / span ${ROW_SPAN[round]}` }}
              >
                {renderTie(id)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
