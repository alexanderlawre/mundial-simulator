import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import CountryFlag from '../common/CountryFlag'
import SambaButton from '../common/SambaButton'
import { useTranslation, translateRoundLabel } from '../../lib/i18n'

// A single team row inside a match card: the real team (tappable to
// pick/flip the winner, or cosmetically "predict" it), or a dashed "TBD"
// placeholder when this slot hasn't been fed a team yet.
function defaultRenderTeam(team, compact, tn) {
  return (
    <>
      <CountryFlag nation={team} size={compact ? 'sm' : 'md'} />
      <span className={`truncate text-charcoal-900 dark:text-sand ${compact ? 'text-xs' : 'text-sm'}`}>{tn(team.name)}</span>
    </>
  )
}

function TeamRow({ team, compact, isWinner, isPredicted, clickable, onClick, showScore, score, wentToPenalties, pen, showAdvances, tbdLabel, advancesLabel, renderTeam }) {
  const { tn } = useTranslation()
  if (!team) {
    return (
      <div className="w-full flex items-center gap-2 rounded-lg px-1.5 py-1">
        <span className={`inline-flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-9 h-9'} rounded-full border-2 border-dashed border-charcoal-900/20 dark:border-white/20 shrink-0`} />
        <span className={`text-charcoal-600 dark:text-charcoal-300 ${compact ? 'text-[11px]' : 'text-xs'}`}>{tbdLabel}</span>
      </div>
    )
  }
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left transition-colors
        ${isWinner ? 'bg-mint/60 font-bold' : ''}
        ${isPredicted ? 'ring-2 ring-gold bg-gold/10' : ''}
        ${clickable ? 'hover:bg-sand dark:hover:bg-night cursor-pointer' : 'cursor-default'}`}
    >
      <span className="flex items-center gap-2 min-w-0">
        {(renderTeam || defaultRenderTeam)(team, compact, tn)}
      </span>
      {showScore && (
        <span className="font-display tabular-nums font-semibold shrink-0 text-charcoal-900 dark:text-sand">
          {score}
          {wentToPenalties && <span className="text-gold text-xs font-semibold"> ({pen})</span>}
        </span>
      )}
      {showAdvances && (
        <span className="text-[10px] uppercase tracking-wide font-semibold text-forest dark:text-mint shrink-0">{advancesLabel}</span>
      )}
    </button>
  )
}

// One match card, covering every state a match can be in: both slots TBD,
// one slot resolved, both present but unplayed (interactive), or played
// (real score, or a scoreless manual pick showing "Advances"). Any played
// match, when `interactive`, STAYS tap-to-edit -- not just the newest
// round -- so changing an earlier match's winner is reachable from anywhere
// in the tree, live stage or celebration recap alike.
function MatchNode({ matchId, meta, data, teamsByName, interactive, allowPredict, onSimulateMatch, onEditMatch, onPredict, userNation, compact, emphasis, registerRef, renderTeam }) {
  const { t } = useTranslation()
  const teamA = data.teamA ? teamsByName[data.teamA] : null
  const teamB = data.teamB ? teamsByName[data.teamB] : null
  const ready = !!(data.teamA && data.teamB)
  const played = !!data.result
  const hasScore = played && data.result.scoreA != null
  const editable = interactive && typeof onEditMatch === 'function' && ready
  const isUserPath = userNation && (data.teamA === userNation || data.teamB === userNation)

  function handleClick(name) {
    if (editable) { onEditMatch(matchId, name); return }
    if (ready && !played && allowPredict) onPredict(matchId, name)
  }

  const borderClass = emphasis === 'final'
    ? 'border-2 border-gold'
    : emphasis === 'third'
      ? 'border border-charcoal-600/40'
      : (isUserPath ? 'border border-gold' : 'border border-charcoal-900/10 dark:border-white/10')

  const rows = [
    { slot: 'A', team: teamA, name: data.teamA, score: data.result?.scoreA, pen: data.result?.penA },
    { slot: 'B', team: teamB, name: data.teamB, score: data.result?.scoreB, pen: data.result?.penB },
  ]

  return (
    <div
      ref={registerRef}
      className={`rounded-xl shadow-depth bg-white dark:bg-night-card overflow-hidden shrink-0 ${borderClass} ${compact ? 'w-40' : 'w-56'}`}
    >
      {meta.label && (
        <p className="text-[9px] uppercase tracking-wide text-charcoal-600/70 dark:text-charcoal-300/70 font-semibold px-2.5 pt-1.5">
          {translateRoundLabel(meta.label, t)}
        </p>
      )}
      <div className="px-2 py-1.5 space-y-1">
        {rows.map((row) => {
          const isWinner = played && data.result.winner === row.name
          const isPredicted = allowPredict && !played && data.predicted === row.name
          const clickable = row.team ? (played ? editable : (ready && (interactive || allowPredict))) : false
          return (
            <TeamRow
              key={row.slot}
              team={row.team}
              compact={compact}
              isWinner={isWinner}
              isPredicted={isPredicted}
              clickable={clickable}
              onClick={() => handleClick(row.name)}
              showScore={hasScore}
              score={row.score}
              wentToPenalties={data.result?.wentToPenalties}
              pen={row.pen}
              showAdvances={played && !hasScore && isWinner}
              tbdLabel={t('play.tbd')}
              advancesLabel={t('play.advances')}
              renderTeam={renderTeam}
            />
          )
        })}
      </div>
      {ready && !played && onSimulateMatch && (
        <div className="px-2 pb-1.5">
          <SambaButton size="sm" variant="outline" className="w-full" onClick={() => onSimulateMatch(matchId)}>
            {t('play.simulateMatchButton')}
          </SambaButton>
        </div>
      )}
    </div>
  )
}

// Classic two-sided converging bracket tree: every round from the first
// knockout round through the Final (+ 3rd Place Playoff) is shown at once,
// built by recursing OUTWARD from the Final through each match's feeder
// wiring -- which naturally produces the correct nested left/right
// structure with zero extra bookkeeping (a match's feederA/feederB chain
// IS the tree). Connector lines are drawn by an SVG overlay whose paths are
// computed from each card's *actual measured position* (via ResizeObserver),
// so the elbow connectors stay pixel-perfect regardless of card height,
// compact-round density, or TBD placeholders.
export default function BracketTree({
  skeleton,
  matchState,
  teamsByName,
  interactive,
  allowPredict,
  onSimulateMatch,
  onEditMatch,
  onPredict,
  userNation,
  renderTeam,
}) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const cardRefs = useRef(new Map())
  const [paths, setPaths] = useState([])

  const roundMatchCount = {}
  ;(skeleton?.rounds || []).forEach((r) => { roundMatchCount[r.roundIdx] = r.matchCount })
  const compactForRound = (roundIdx) => (roundMatchCount[roundIdx] || 0) > 4

  useLayoutEffect(() => {
    function recompute() {
      const container = containerRef.current
      if (!container || !skeleton) return
      const containerRect = container.getBoundingClientRect()
      const next = []
      Object.values(skeleton.matches).forEach((meta) => {
        if (!meta.feederA) return
        const targetEl = cardRefs.current.get(meta.id)
        const aEl = cardRefs.current.get(meta.feederA.matchId)
        const bEl = cardRefs.current.get(meta.feederB.matchId)
        if (!targetEl || !aEl || !bEl) return
        const t0 = targetEl.getBoundingClientRect()
        ;[aEl, bEl].forEach((feederEl) => {
          const f = feederEl.getBoundingClientRect()
          const feedersOnLeft = f.left < t0.left
          const fx = (feedersOnLeft ? f.right : f.left) - containerRect.left
          const fy = f.top + f.height / 2 - containerRect.top
          const tx = (feedersOnLeft ? t0.left : t0.right) - containerRect.left
          const ty = t0.top + t0.height / 2 - containerRect.top
          const midX = (fx + tx) / 2
          next.push(`M ${fx} ${fy} H ${midX} V ${ty} H ${tx}`)
        })
      })
      setPaths(next)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', recompute)
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute) }
  }, [skeleton, matchState])

  const finalRoundMeta = skeleton?.rounds[skeleton.rounds.length - 1]
  const isBundled = !!finalRoundMeta?.customLabels
  const finalMatchId = finalRoundMeta ? `m${finalRoundMeta.roundIdx}-${isBundled ? 1 : 0}` : null
  const thirdMatchId = isBundled ? `m${finalRoundMeta.roundIdx}-0` : null

  // Auto-scroll the Final into view once per tournament (new skeleton
  // instance = a fresh knockout stage started).
  useEffect(() => {
    if (!finalMatchId) return
    const timer = setTimeout(() => {
      cardRefs.current.get(finalMatchId)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }, 80)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skeleton])

  if (!skeleton || !matchState) return null

  function renderNode(matchId) {
    const meta = skeleton.matches[matchId]
    return (
      <MatchNode
        matchId={matchId}
        meta={meta}
        data={matchState[matchId]}
        teamsByName={teamsByName}
        interactive={interactive}
        allowPredict={allowPredict}
        onSimulateMatch={onSimulateMatch}
        onEditMatch={onEditMatch}
        onPredict={onPredict}
        userNation={userNation}
        compact={compactForRound(meta.roundIdx)}
        emphasis={matchId === finalMatchId ? 'final' : matchId === thirdMatchId ? 'third' : null}
        registerRef={(el) => cardRefs.current.set(matchId, el)}
        renderTeam={renderTeam}
      />
    )
  }

  // Recurses outward from a match toward round 0, building the correctly
  // nested left-half (`dir==='ltr'`: children left, this match right,
  // converging rightward) or right-half (`dir==='rtl'`: mirrored) subtree.
  function renderSubtree(matchId, dir) {
    const meta = skeleton.matches[matchId]
    if (!meta.feederA) return <div key={matchId}>{renderNode(matchId)}</div>
    const pair = (
      <div className="flex flex-col justify-around gap-y-4">
        {renderSubtree(meta.feederA.matchId, dir)}
        {renderSubtree(meta.feederB.matchId, dir)}
      </div>
    )
    const node = renderNode(matchId)
    return (
      <div key={matchId} className="flex items-center gap-x-6">
        {dir === 'ltr' ? <>{pair}{node}</> : <>{node}{pair}</>}
      </div>
    )
  }

  let body
  if (!finalMatchId) {
    body = null
  } else {
    const finalMeta = skeleton.matches[finalMatchId]
    const finalColumn = (
      <div className="flex flex-col items-center gap-y-3 shrink-0">
        {renderNode(finalMatchId)}
        {thirdMatchId && renderNode(thirdMatchId)}
      </div>
    )
    body = finalMeta.feederA ? (
      <div className="flex items-center gap-x-10">
        {renderSubtree(finalMeta.feederA.matchId, 'ltr')}
        {finalColumn}
        {renderSubtree(finalMeta.feederB.matchId, 'rtl')}
      </div>
    ) : (
      finalColumn
    )
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
      <div className="px-4 py-3 bg-forest text-white font-display font-semibold">
        {t('play.tournamentBracket')}
      </div>
      <div className="overflow-x-auto -mx-0 px-6 py-6">
        <div ref={containerRef} className="relative w-max mx-auto">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <g className="stroke-charcoal-900/20 dark:stroke-white/20" fill="none" strokeWidth="1.5">
              {paths.map((d, i) => <path key={i} d={d} />)}
            </g>
          </svg>
          {body}
        </div>
      </div>
    </div>
  )
}
