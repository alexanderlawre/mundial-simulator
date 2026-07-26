import { useLayoutEffect, useRef, useState } from 'react'
import CountryFlag from '../common/CountryFlag'
import { useTranslation } from '../../lib/i18n'

// One team chip inside a mini match node: a tiny circular flag + 3-letter
// FIFA code. The winner is bright/bold; the loser is faded so the eye reads
// the bracket as a trail of advancing flags. A team that went on to become
// champion gets a gold ring on every chip along its route, so the champion's
// whole path is traceable at a glance without any interaction.
function MiniTeamChip({ team, isWinner, isChampionPick }) {
  if (!team) {
    return <div className="w-4 h-4 rounded-full border border-dashed border-charcoal-900/20 dark:border-white/20 shrink-0" />
  }
  return (
    <div className={`flex items-center gap-1 min-w-0 ${isWinner ? '' : 'opacity-40 grayscale'}`}>
      <CountryFlag nation={team} size="xs" className={isChampionPick ? 'ring-2 ring-gold' : ''} />
      <span translate="no" className={`notranslate text-[8px] font-bold tracking-wide tabular-nums truncate ${isWinner ? 'text-charcoal-900 dark:text-sand' : 'text-charcoal-600 dark:text-charcoal-400'}`}>
        {team.fifaCode}
      </span>
    </div>
  )
}

function MiniMatchNode({ matchId, data, teamsByName, championMatchIds, emphasis, registerRef }) {
  const teamA = data.teamA ? teamsByName[data.teamA] : null
  const teamB = data.teamB ? teamsByName[data.teamB] : null
  const winner = data.result?.winner
  const isChampionMatch = championMatchIds.has(matchId)

  const borderClass = emphasis === 'final'
    ? 'border-2 border-gold'
    : emphasis === 'third'
      ? 'border border-charcoal-600/40'
      : 'border border-charcoal-900/10 dark:border-white/10'

  return (
    <div
      ref={registerRef}
      className={`flex flex-col gap-0.5 rounded-md bg-white dark:bg-night-card px-1 py-0.5 shrink-0 ${borderClass}`}
    >
      <MiniTeamChip team={teamA} isWinner={winner === data.teamA} isChampionPick={isChampionMatch && winner === data.teamA} />
      <MiniTeamChip team={teamB} isWinner={winner === data.teamB} isChampionPick={isChampionMatch && winner === data.teamB} />
    </div>
  )
}

// Compact, read-only recap of a finished bracket: same converging-tree
// shape as BracketTree, but every match is a tiny flag chip instead of a
// full card, and the whole tree is measured and CSS-scaled down (never
// scrolled) so it always fits its container -- flags shrink together
// uniformly on narrow screens rather than spilling outside the frame.
export default function BracketRecap({ skeleton, matchState, teamsByName, champion }) {
  const { t } = useTranslation()
  const outerRef = useRef(null)
  const containerRef = useRef(null)
  const cardRefs = useRef(new Map())
  const [paths, setPaths] = useState([])
  const [scale, setScale] = useState(1)
  const [naturalHeight, setNaturalHeight] = useState(0)

  useLayoutEffect(() => {
    function recompute() {
      const outer = outerRef.current
      const container = containerRef.current
      if (!outer || !container || !skeleton) return

      const availableWidth = outer.clientWidth
      const naturalWidth = container.offsetWidth
      const nextHeight = container.offsetHeight
      const nextScale = availableWidth > 0 && naturalWidth > availableWidth ? availableWidth / naturalWidth : 1

      const containerRect = container.getBoundingClientRect()
      const nextPaths = []
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
          const fx = ((feedersOnLeft ? f.right : f.left) - containerRect.left) / nextScale
          const fy = (f.top + f.height / 2 - containerRect.top) / nextScale
          const tx = ((feedersOnLeft ? t0.left : t0.right) - containerRect.left) / nextScale
          const ty = (t0.top + t0.height / 2 - containerRect.top) / nextScale
          const midX = (fx + tx) / 2
          nextPaths.push(`M ${fx} ${fy} H ${midX} V ${ty} H ${tx}`)
        })
      })

      setScale(nextScale)
      setNaturalHeight(nextHeight)
      setPaths(nextPaths)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    if (outerRef.current) ro.observe(outerRef.current)
    window.addEventListener('resize', recompute)
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute) }
    // `scale` is intentionally a dependency: the very first pass computes
    // the correct scale but measures connector positions against the DOM
    // *before* that scale's transform has actually been applied (it's
    // still mid-commit), so paths can be one render stale. Re-running once
    // `scale` itself changes re-measures against the now-transformed DOM
    // and settles immediately (nextScale is deterministic from
    // transform-independent offsetWidth/clientWidth, so this converges in
    // at most one extra pass, no infinite loop).
  }, [skeleton, matchState, scale])

  if (!skeleton || !matchState) return null

  // Every match the champion actually won -- used to add a gold ring to
  // that team's chip in each of those matches, tracing its route.
  const championMatchIds = new Set(
    champion
      ? Object.entries(matchState).filter(([, m]) => m.result?.winner === champion).map(([id]) => id)
      : []
  )

  const finalRoundMeta = skeleton.rounds[skeleton.rounds.length - 1]
  const isBundled = !!finalRoundMeta?.customLabels
  const finalMatchId = finalRoundMeta ? `m${finalRoundMeta.roundIdx}-${isBundled ? 1 : 0}` : null
  const thirdMatchId = isBundled ? `m${finalRoundMeta.roundIdx}-0` : null

  function renderNode(matchId) {
    return (
      <MiniMatchNode
        matchId={matchId}
        data={matchState[matchId]}
        teamsByName={teamsByName}
        championMatchIds={championMatchIds}
        emphasis={matchId === finalMatchId ? 'final' : matchId === thirdMatchId ? 'third' : null}
        registerRef={(el) => cardRefs.current.set(matchId, el)}
      />
    )
  }

  function renderSubtree(matchId, dir) {
    const meta = skeleton.matches[matchId]
    if (!meta.feederA) return <div key={matchId}>{renderNode(matchId)}</div>
    const pair = (
      <div className="flex flex-col justify-around gap-y-1.5">
        {renderSubtree(meta.feederA.matchId, dir)}
        {renderSubtree(meta.feederB.matchId, dir)}
      </div>
    )
    const node = renderNode(matchId)
    return (
      <div key={matchId} className="flex items-center gap-x-3">
        {dir === 'ltr' ? <>{pair}{node}</> : <>{node}{pair}</>}
      </div>
    )
  }

  let body = null
  if (finalMatchId) {
    const finalMeta = skeleton.matches[finalMatchId]
    const finalColumn = (
      <div className="flex flex-col items-center gap-y-1.5 shrink-0">
        {renderNode(finalMatchId)}
        {thirdMatchId && renderNode(thirdMatchId)}
      </div>
    )
    body = finalMeta.feederA ? (
      <div className="flex items-center gap-x-4">
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
      <div className="px-4 py-3 bg-forest text-white font-display font-semibold text-left">
        {t('play.tournamentBracket')}
      </div>
      <div ref={outerRef} className="w-full overflow-hidden px-3 py-4" style={{ height: naturalHeight * scale + 32 }}>
        <div className="w-full flex justify-center">
          <div
            ref={containerRef}
            className="relative w-max"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              <g className="stroke-charcoal-900/20 dark:stroke-white/20" fill="none" strokeWidth="1.5">
                {paths.map((d, i) => <path key={i} d={d} />)}
              </g>
            </svg>
            {body}
          </div>
        </div>
      </div>
    </div>
  )
}
