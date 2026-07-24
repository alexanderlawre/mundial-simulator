import { useEffect, useMemo, useRef, useState } from 'react'
import {
  scheduleGroupRounds,
  flattenGroupRounds,
  computeStandings,
  rankThirdPlace,
  buildBracketSlots,
  buildGroupCrisscrossPairs,
  buildWC2026BracketPairs,
  nextRoundPairs,
  buildBracketSkeleton,
  buildAdvancesToMap,
  applyKnockoutResult,
  initialMatchState,
  buildWinnerOnlyResult,
} from '../../lib/tournamentEngine'
import { simulateMatch } from '../../lib/matchEngine'
import { logSimulationResult, syncSimulationToCloud, addLocalSimulationHistory, setSimulationPinned } from '../../lib/storage'
import { useAuth } from '../../lib/AuthContext'
import MatchCard from './MatchCard'
import GroupTable from './GroupTable'
import BracketTree from './BracketTree'
import BracketRecap from './BracketRecap'
import ThirdPlacePicker from './ThirdPlacePicker'
import GroupRankEditor from './GroupRankEditor'
import TournamentSummary from './TournamentSummary'
import SambaButton from '../common/SambaButton'
import CountryFlag from '../common/CountryFlag'
import NavBar from '../common/NavBar'
import GuestPrompt from '../common/GuestPrompt'
import WorldCupShareModal from './WorldCupShareModal'
import { useTranslation, translateRoundLabel } from '../../lib/i18n'

// Synthetic standings rows for a manually-ranked group -- shaped identically
// to computeStandings()'s output (team/played/won/drawn/lost/gf/ga/gd/points/
// cards/position) so GroupTable, rankThirdPlace, buildGroupCrisscrossPairs
// and buildWC2026BracketPairs all keep working unmodified; they only read
// .team and .points/.gd/.gf for ordering/tie-breaking.
function manualStandingRows(order) {
  const n = order.length
  return order.map((name, i) => ({
    team: name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: (n - i) * 3,
    cards: 0,
    position: i + 1,
  }))
}

// Read-only view of a manually-ranked group: just the teams in finishing
// order (rank + flag + name) -- no points/W-D-L/GD, since none of that was
// actually played out.
function ManualStandingsList({ letter, order, teamsByName, advanceCount }) {
  const { t, tn } = useTranslation()
  return (
    <div className="rounded-2xl bg-white dark:bg-night-card border border-charcoal-900/10 dark:border-white/10 shadow-depth overflow-hidden">
      <div className="px-4 py-2 bg-forest text-white font-display font-semibold">{t('play.group', { letter })}</div>
      <div className="divide-y divide-charcoal-900/5">
        {order.map((name, i) => {
          const team = teamsByName[name]
          const advances = i < advanceCount
          return (
            <div key={name} className={`flex items-center gap-2 px-4 py-2 text-sm ${advances ? 'bg-mint/40' : ''}`}>
              <span className="text-xs text-charcoal-600 dark:text-charcoal-300 w-4">{i + 1}</span>
              {team && <CountryFlag nation={team} size="sm" />}
              {team?.fifaCode && (
                <span className="font-display text-[10px] font-bold tracking-widest text-charcoal-600 dark:text-charcoal-300 bg-charcoal-900/5 rounded px-1.5 py-0.5 w-10 text-center shrink-0 tabular-nums">
                  {team.fifaCode}
                </span>
              )}
              <span className="font-medium truncate">{tn(name)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Per-group panel shown when a group is in 'manual' mode: a reorder list
// until confirmed, then a read-only team-order list (no stats) with an Edit toggle.
function ManualGroupPanel({ letter, teams, teamsByName, advanceCount, manualOrder, onConfirm, onBackToPicker }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(!manualOrder)

  if (editing) {
    return (
      <GroupRankEditor
        teams={teams}
        initialOrder={manualOrder}
        onConfirm={(order) => { onConfirm(order); setEditing(false) }}
        onCancel={manualOrder ? () => setEditing(false) : onBackToPicker}
      />
    )
  }

  return (
    <div className="space-y-2">
      <ManualStandingsList letter={letter} order={manualOrder} teamsByName={teamsByName} advanceCount={advanceCount} />
      <SambaButton size="sm" variant="outline" className="w-full" onClick={() => setEditing(true)}>
        {t('play.editStandings')}
      </SambaButton>
    </div>
  )
}

export default function TournamentPlay({
  initialGroups,       // { A: [team,...], B: [...] } or null
  knockoutOnlyTeams,   // [team,...] used when initialGroups is null
  format,              // { advancePerGroup, bestThirds, has3rdPlace }
  title,
  hostLabel,
  userNation,
  onRestart,
  interactivity = 'full', // 'full' | 'simulateOnly' -- simulateOnly hides all edit/manual-ranking UI (Historic Cups)
  mode,                   // 'historic' | 'custom' | 'wc2026' -- for analytics logging
  descriptor,             // year (historic) / team count (custom) / '2026' (wc2026) -- for analytics logging
}) {
  const { t, tn } = useTranslation()
  const { user } = useAuth()
  const [guestPromptDismissed, setGuestPromptDismissed] = useState(false)
  const teamsByName = useMemo(() => {
    const map = {}
    if (initialGroups) {
      Object.values(initialGroups).forEach((list) => list.forEach((t) => { map[t.name] = t }))
    } else {
      (knockoutOnlyTeams || []).forEach((t) => { map[t.name] = t })
    }
    return map
  }, [initialGroups, knockoutOnlyTeams])

  // ---------- Group stage state ----------
  // Each group's matches are scheduled into matchday rounds (circle method)
  // so every team plays every other team exactly once, in a random round
  // order -- fixtures[letter].pairs is flattened in matchday order, with a
  // parallel .matchday[idx] round index for display.
  const [fixtures] = useState(() => {
    if (!initialGroups) return null
    const obj = {}
    Object.entries(initialGroups).forEach(([letter, teams]) => {
      const rounds = scheduleGroupRounds(teams.map((t) => t.name), 'group-' + letter)
      obj[letter] = flattenGroupRounds(rounds)
    })
    return obj
  })
  const [groupMatches, setGroupMatches] = useState(() => {
    if (!fixtures) return null
    const obj = {}
    Object.keys(fixtures).forEach((letter) => { obj[letter] = fixtures[letter].pairs.map(() => null) })
    return obj
  })

  // Per-group mode ('simulate' | 'manual' | null = undecided) and the
  // confirmed manual finishing order once set. Only relevant when
  // interactivity === 'full'; Historic Cups (simulateOnly) never touch these.
  const [groupMode, setGroupMode] = useState(() => {
    if (!initialGroups) return {}
    const obj = {}
    Object.keys(initialGroups).forEach((letter) => { obj[letter] = null })
    return obj
  })
  const [manualStandings, setManualStandings] = useState({})

  const [stage, setStage] = useState(initialGroups ? 'groups' : 'knockout')
  const [thirdPlaceSelected, setThirdPlaceSelected] = useState([])

  // Reactive bracket graph: `bracketSkeleton` is the fixed shape (rounds,
  // match ids, feeder wiring) -- fully knowable up front since nextRoundPairs
  // is purely positional -- and `matchState` is the only thing that actually
  // changes as the tournament is played. Resolving any match propagates its
  // winner straight into the next match's slot (see applyKnockoutResult);
  // editing any match -- live or archived -- re-runs the same propagation
  // and cascades invalidation forward through whatever it had fed.
  const [bracketSkeleton, setBracketSkeleton] = useState(() => {
    if (initialGroups) return null
    const sorted = [...(knockoutOnlyTeams || [])].sort((a, b) => b.rating - a.rating)
    const qualified = sorted.map((t) => ({ team: t.name, groupLetter: null, tier: 0, rating: t.rating }))
    const slots = buildBracketSlots(qualified)
    return buildBracketSkeleton(slots.length, format.has3rdPlace)
  })
  const [matchState, setMatchState] = useState(() => {
    if (initialGroups) return null
    const sorted = [...(knockoutOnlyTeams || [])].sort((a, b) => b.rating - a.rating)
    const qualified = sorted.map((t) => ({ team: t.name, groupLetter: null, tier: 0, rating: t.rating }))
    const pairs = nextRoundPairs(buildBracketSlots(qualified))
    return initialMatchState(bracketSkeleton, pairs)
  })
  const advancesTo = useMemo(() => (bracketSkeleton ? buildAdvancesToMap(bracketSkeleton) : null), [bracketSkeleton])

  const allGroupMatchesDone = groupMatches
    ? Object.keys(groupMatches).every((letter) => (
        groupMode[letter] === 'manual'
          ? !!manualStandings[letter]
          : groupMatches[letter].every((m) => m !== null)
      ))
    : true

  // Used to disable the top-level "simulate" buttons only when there's
  // nothing left to simulate (manual-mode groups don't count).
  const anySimulatableGroupMatchLeft = groupMatches
    ? Object.entries(groupMatches).some(([letter, arr]) => groupMode[letter] !== 'manual' && arr.some((m) => m === null))
    : false

  function simulateOneGroupMatch() {
    setGroupMatches((prev) => {
      const next = { ...prev }
      for (const letter of Object.keys(next)) {
        if (groupMode[letter] === 'manual') continue
        const arr = [...next[letter]]
        const idx = arr.findIndex((m) => m === null)
        if (idx !== -1) {
          const [nameA, nameB] = fixtures[letter].pairs[idx]
          arr[idx] = simulateMatch(teamsByName[nameA], teamsByName[nameB], { seedKey: letter + idx })
          next[letter] = arr
          return next
        }
      }
      return prev
    })
  }

  function simulateAllGroupMatches() {
    setGroupMatches((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((letter) => {
        if (groupMode[letter] === 'manual') return
        next[letter] = next[letter].map((m, idx) => {
          if (m) return m
          const [nameA, nameB] = fixtures[letter].pairs[idx]
          return simulateMatch(teamsByName[nameA], teamsByName[nameB], { seedKey: letter + idx })
        })
      })
      return next
    })
  }

  function chooseGroupMode(letter, nextMode) {
    setGroupMode((prev) => ({ ...prev, [letter]: nextMode }))
  }

  function confirmManualStandings(letter, order) {
    setManualStandings((prev) => ({ ...prev, [letter]: order }))
  }

  const groupStandings = useMemo(() => {
    if (!groupMatches || !allGroupMatchesDone) return null
    const out = {}
    Object.entries(initialGroups).forEach(([letter, teams]) => {
      if (groupMode[letter] === 'manual' && manualStandings[letter]) {
        out[letter] = manualStandingRows(manualStandings[letter])
      } else {
        out[letter] = computeStandings(teams.map((t) => t.name), groupMatches[letter])
      }
    })
    return out
  }, [groupMatches, allGroupMatchesDone, initialGroups, groupMode, manualStandings])

  const thirdPlaceRows = useMemo(() => {
    if (!groupStandings || !format.bestThirds) return []
    return Object.entries(groupStandings).map(([letter, rows]) => ({
      ...rows[format.advancePerGroup],
      groupLetter: letter,
      isManual: groupMode[letter] === 'manual',
    }))
  }, [groupStandings, format, groupMode])

  const suggestedThirds = useMemo(() => {
    if (!thirdPlaceRows.length) return []
    return rankThirdPlace(thirdPlaceRows).slice(0, format.bestThirds).map((r) => r.team)
  }, [thirdPlaceRows, format])

  function goToGroupReview() {
    setStage('group_review')
  }

  function proceedFromReview() {
    if (format.bestThirds > 0) {
      setStage('third_place_pick')
    } else {
      startKnockout([])
    }
  }

  function startKnockout(selectedThirds) {
    // The 12-group/8-thirds shape (literal WC2026 mode and the 48-team
    // custom simulator) uses the real-world 2026 FIFA draw structure instead
    // of the generic crisscross (irregular runner-up pairings + a
    // winner-specific third-place eligibility table -- see tournamentEngine).
    const isWC2026Shape = Object.keys(groupStandings).length === 12 && format.bestThirds === 8

    let pairs
    if (isWC2026Shape) {
      const thirdEntries = thirdPlaceRows
        .filter((r) => selectedThirds.includes(r.team))
        .map((r) => ({ team: r.team, groupLetter: r.groupLetter }))
      pairs = buildWC2026BracketPairs(groupStandings, thirdEntries)
    } else {
      let rankedThirds = []
      if (selectedThirds.length) {
        rankedThirds = rankThirdPlace(thirdPlaceRows)
          .map((r) => r.team)
          .filter((name) => selectedThirds.includes(name))
      }
      pairs = buildGroupCrisscrossPairs(groupStandings, format, rankedThirds)
    }
    const skeleton = buildBracketSkeleton(pairs.length * 2, format.has3rdPlace)
    setBracketSkeleton(skeleton)
    setMatchState(initialMatchState(skeleton, pairs))
    setStage('knockout')
  }

  // Champion/runner-up/3rd/4th are DERIVED from matchState rather than
  // stored -- they read straight off the Final (and, if bundled, 3rd Place
  // Playoff) match's slots, so they can never desync from the bracket and
  // automatically "un-crown" if a cascade invalidation reopens the Final.
  const finalRound = bracketSkeleton ? bracketSkeleton.rounds[bracketSkeleton.rounds.length - 1] : null
  const finalMatchId = finalRound ? `m${finalRound.roundIdx}-${finalRound.customLabels ? 1 : 0}` : null
  const thirdMatchId = finalRound?.customLabels ? `m${finalRound.roundIdx}-0` : null
  const finalMatch = finalMatchId && matchState ? matchState[finalMatchId] : null
  const thirdMatch = thirdMatchId && matchState ? matchState[thirdMatchId] : null
  const champion = finalMatch?.result?.winner ?? null
  const runnerUpTeam = finalMatch?.result
    ? (finalMatch.result.winner === finalMatch.teamA ? finalMatch.teamB : finalMatch.teamA)
    : null
  const thirdPlaceTeam = thirdMatch?.result?.winner ?? null
  const fourthPlaceTeam = thirdMatch?.result
    ? (thirdMatch.result.winner === thirdMatch.teamA ? thirdMatch.teamB : thirdMatch.teamA)
    : null

  // Bracket-order list of every match id (feeders always precede whatever
  // they feed, since round index only increases), used to find "the next
  // playable match" and to drive a single-pass full-bracket simulation.
  const orderedMatchIds = useMemo(() => (
    bracketSkeleton
      ? Object.values(bracketSkeleton.matches)
          .sort((a, b) => a.roundIdx - b.roundIdx || a.slotIndex - b.slotIndex)
          .map((m) => m.id)
      : []
  ), [bracketSkeleton])

  const nextReadyMatchId = useMemo(() => {
    if (!matchState) return null
    return orderedMatchIds.find((id) => {
      const m = matchState[id]
      return m.teamA && m.teamB && !m.result
    }) || null
  }, [orderedMatchIds, matchState])

  const activeRoundLabel = useMemo(() => {
    if (!bracketSkeleton || !nextReadyMatchId) return null
    const meta = bracketSkeleton.matches[nextReadyMatchId]
    const round = bracketSkeleton.rounds.find((r) => r.roundIdx === meta.roundIdx)
    return meta.label || round?.label
  }, [bracketSkeleton, nextReadyMatchId])

  function simulateKnockoutMatchById(id) {
    setMatchState((prev) => {
      const cur = prev[id]
      if (!cur || cur.result || !cur.teamA || !cur.teamB) return prev
      const roundIdx = bracketSkeleton.matches[id].roundIdx
      const roundMatchCount = bracketSkeleton.rounds.find((r) => r.roundIdx === roundIdx).matchCount
      const result = simulateMatch(teamsByName[cur.teamA], teamsByName[cur.teamB], {
        knockout: true,
        seedKey: id,
        roundSize: roundMatchCount * 2,
      })
      return applyKnockoutResult(bracketSkeleton, advancesTo, prev, id, result)
    })
  }

  // Manual override -- lets the user directly pick (or flip) the winner of
  // ANY match, anywhere in the bracket, played or not, live round or an
  // already-archived one -- instead of relying on simulation. No scoreline
  // is fabricated (see buildWinnerOnlyResult). Changing an earlier match's
  // winner automatically cascades: only the specific downstream slot(s) that
  // depended on the old winner are cleared (their opponent slot, fed by an
  // unrelated branch, is left alone), and those matches revert to unplayed.
  function editKnockoutMatchResult(id, winnerName) {
    setMatchState((prev) => {
      const cur = prev[id]
      if (!cur || !cur.teamA || !cur.teamB) return prev
      const result = buildWinnerOnlyResult(cur.teamA, cur.teamB, winnerName)
      return applyKnockoutResult(bracketSkeleton, advancesTo, prev, id, result)
    })
  }

  function setKnockoutPrediction(id, teamName) {
    setMatchState((prev) => {
      const cur = prev[id]
      if (!cur || cur.result) return prev
      return { ...prev, [id]: { ...cur, predicted: cur.predicted === teamName ? null : teamName } }
    })
  }

  function simulateOneKnockoutMatch() {
    if (nextReadyMatchId) simulateKnockoutMatchById(nextReadyMatchId)
  }

  function simulateAllKnockoutMatches() {
    setMatchState((prev) => {
      let next = prev
      for (const id of orderedMatchIds) {
        const cur = next[id]
        if (cur.result || !cur.teamA || !cur.teamB) continue
        const roundIdx = bracketSkeleton.matches[id].roundIdx
        const roundMatchCount = bracketSkeleton.rounds.find((r) => r.roundIdx === roundIdx).matchCount
        const result = simulateMatch(teamsByName[cur.teamA], teamsByName[cur.teamB], {
          knockout: true,
          seedKey: id,
          roundSize: roundMatchCount * 2,
        })
        next = applyKnockoutResult(bracketSkeleton, advancesTo, next, id, result)
      }
      return next
    })
  }

  // Flip the screen to the celebration recap once a champion is crowned
  // (short delay purely so the Final's scoreline registers first -- this is
  // the only remaining setTimeout in the whole flow; nothing about the
  // bracket DATA itself is gated by it). If a later edit's cascade
  // invalidation reaches the Final and un-crowns the champion, snap straight
  // back to the live bracket -- instantly, since that's a correction, not a
  // reveal.
  useEffect(() => {
    if (!bracketSkeleton) return
    if (champion && stage === 'knockout') {
      const timer = setTimeout(() => setStage('celebration'), 700)
      return () => clearTimeout(timer)
    }
    if (!champion && stage === 'celebration') {
      setStage('knockout')
    }
  }, [champion, stage, bracketSkeleton])

  // Log the outcome once, the first time this tournament reaches celebration.
  // Also mirrors the result into a pin-able record (cloud row for logged-in
  // users, local-storage record for guests) so the "Pin this result" button
  // below has a stable id to spotlight on the Account page.
  const loggedRef = useRef(false)
  const [resultId, setResultId] = useState(null)
  const [pinned, setPinned] = useState(false)
  const [showShare, setShowShare] = useState(false)
  useEffect(() => {
    if (stage !== 'celebration' || loggedRef.current || !mode) return
    loggedRef.current = true
    const entry = {
      mode,
      descriptor,
      winner: champion,
      runnerUp: runnerUpTeam,
      third: thirdPlaceTeam,
      fourth: fourthPlaceTeam,
    }
    logSimulationResult(entry)
    if (user?.id) {
      syncSimulationToCloud(user.id, entry).then((id) => { if (id) setResultId(id) })
    } else {
      setResultId(addLocalSimulationHistory(entry).id)
    }
  }, [stage, mode, descriptor, champion, runnerUpTeam, thirdPlaceTeam, fourthPlaceTeam, user])

  function togglePin() {
    if (!resultId) return
    const next = !pinned
    setSimulationPinned(resultId, next)
    setPinned(next)
  }

  // ---------- Render ----------

  if (stage === 'groups') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Header title={title} hostLabel={hostLabel} />
        <div className="flex gap-2 flex-wrap">
          <SambaButton onClick={simulateOneGroupMatch} disabled={!anySimulatableGroupMatchLeft}>{t('play.simulateNext')}</SambaButton>
          <SambaButton variant="secondary" onClick={simulateAllGroupMatches} disabled={!anySimulatableGroupMatchLeft}>
            {t('play.simulateRestGroup')}
          </SambaButton>
          {allGroupMatchesDone && (
            <SambaButton variant="gold" onClick={goToGroupReview}>{t('play.viewGroupResults')}</SambaButton>
          )}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(initialGroups).map(([letter, teams]) => {
            const matches = groupMatches[letter]
            const nextIdx = matches.findIndex((m) => m === null)
            const playedIdxs = matches
              .map((m, idx) => idx)
              .filter((idx) => matches[idx] !== null)
              .reverse()
            const mode = groupMode[letter]
            const showManual = interactivity === 'full' && mode === 'manual'
            return (
              <div key={letter} className="rounded-2xl bg-white/70 dark:bg-night-card/70 shadow-depth p-3 space-y-3">
                <p className="font-display font-semibold text-charcoal-900 dark:text-sand">{t('play.group', { letter })}</p>
                {interactivity === 'full' && (
                  <div className="grid grid-cols-2 gap-2">
                    <SambaButton
                      size="sm"
                      variant={mode === 'manual' ? 'outline' : 'primary'}
                      onClick={() => chooseGroupMode(letter, 'simulate')}
                    >
                      {t('play.simulateMatches')}
                    </SambaButton>
                    <SambaButton
                      size="sm"
                      variant={mode === 'manual' ? 'primary' : 'outline'}
                      onClick={() => chooseGroupMode(letter, 'manual')}
                    >
                      {t('play.setFinalStandings')}
                    </SambaButton>
                  </div>
                )}
                {showManual && (
                  <ManualGroupPanel
                    letter={letter}
                    teams={teams}
                    teamsByName={teamsByName}
                    advanceCount={format.advancePerGroup}
                    manualOrder={manualStandings[letter]}
                    onConfirm={(order) => confirmManualStandings(letter, order)}
                    onBackToPicker={() => chooseGroupMode(letter, 'simulate')}
                  />
                )}
                {!showManual && (
                  <>
                    {nextIdx !== -1 && (
                      <MatchCard
                        variant="hero"
                        label={`Matchday ${fixtures[letter].matchday[nextIdx] + 1}`}
                        teamA={teamsByName[fixtures[letter].pairs[nextIdx][0]]}
                        teamB={teamsByName[fixtures[letter].pairs[nextIdx][1]]}
                      />
                    )}
                    {playedIdxs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] uppercase tracking-wide text-charcoal-600/70 font-semibold">{t('play.pastResults')}</p>
                        {playedIdxs.map((idx) => (
                          <MatchCard
                            key={idx}
                            variant="compact"
                            label={`Matchday ${fixtures[letter].matchday[idx] + 1}`}
                            match={matches[idx]}
                            teamA={teamsByName[fixtures[letter].pairs[idx][0]]}
                            teamB={teamsByName[fixtures[letter].pairs[idx][1]]}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (stage === 'group_review') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Header title={title} hostLabel={hostLabel} subtitle={t('play.groupStageResults')} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupStandings).map(([letter, rows]) => (
            groupMode[letter] === 'manual' ? (
              <ManualStandingsList
                key={letter}
                letter={letter}
                order={manualStandings[letter] || rows.map((r) => r.team)}
                teamsByName={teamsByName}
                advanceCount={format.advancePerGroup}
              />
            ) : (
              <GroupTable key={letter} letter={letter} standings={rows} teamsByName={teamsByName} advanceCount={format.advancePerGroup} />
            )
          ))}
        </div>
        <div className="flex justify-center gap-2">
          <SambaButton variant="outline" size="lg" onClick={() => setStage('groups')}>{t('play.backToMatches')}</SambaButton>
          <SambaButton variant="primary" size="lg" onClick={proceedFromReview}>
            {format.bestThirds > 0 ? t('play.continueThirdPlace') : t('play.continueKnockouts')}
          </SambaButton>
        </div>
      </div>
    )
  }

  if (stage === 'third_place_pick') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Header title={title} hostLabel={hostLabel} subtitle={t('play.bestThirdPlace')} />
        <ThirdPlacePicker
          rows={thirdPlaceRows}
          teamsByName={teamsByName}
          needed={format.bestThirds}
          selected={thirdPlaceSelected}
          onToggle={(name) => setThirdPlaceSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])}
          onAutoFill={() => setThirdPlaceSelected(suggestedThirds)}
        />
        <div className="flex justify-center">
          <SambaButton
            variant="primary"
            size="lg"
            disabled={thirdPlaceSelected.length !== format.bestThirds}
            onClick={() => startKnockout(thirdPlaceSelected)}
          >
            {t('play.confirmStartKnockouts')}
          </SambaButton>
        </div>
      </div>
    )
  }

  if (stage === 'knockout') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Header title={title} hostLabel={hostLabel} subtitle={activeRoundLabel ? translateRoundLabel(activeRoundLabel, t) : null} />
        <div className="flex gap-2 flex-wrap items-center">
          <SambaButton onClick={simulateOneKnockoutMatch} disabled={!nextReadyMatchId}>{t('play.simulateNext')}</SambaButton>
          <SambaButton variant="secondary" onClick={simulateAllKnockoutMatches} disabled={!nextReadyMatchId}>
            {t('play.simulateRestBracket')}
          </SambaButton>
          {!nextReadyMatchId && !champion && (
            <span className="text-sm italic text-charcoal-600 dark:text-charcoal-300">{t('play.crowningChampion')}</span>
          )}
        </div>
        <BracketTree
          skeleton={bracketSkeleton}
          matchState={matchState}
          teamsByName={teamsByName}
          interactive={interactivity === 'full'}
          allowPredict={interactivity === 'simulateOnly'}
          onSimulateMatch={simulateKnockoutMatchById}
          onEditMatch={interactivity === 'full' ? editKnockoutMatchResult : undefined}
          onPredict={setKnockoutPrediction}
          userNation={userNation}
        />
      </div>
    )
  }

  if (stage === 'celebration') {
    const championTeam = teamsByName[champion]
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="text-left mb-8">
          <NavBar title={title} subtitle={hostLabel} />
        </div>
        <p className="uppercase tracking-widest text-gold font-semibold mb-3">{t('play.champions')}</p>
        <div className="flex flex-col items-center gap-4 mb-6">
          <CountryFlag nation={championTeam} size="xl" />
          <h1 className="font-display text-4xl font-extrabold text-forest dark:text-mint">{tn(champion)}</h1>
          <p className="text-charcoal-600 dark:text-charcoal-300">{title}{hostLabel ? ` · ${hostLabel}` : ''}</p>
        </div>
        <div className="mb-6">
          <TournamentSummary
            champion={champion}
            runnerUp={runnerUpTeam}
            thirdPlace={thirdPlaceTeam}
            fourthPlace={fourthPlaceTeam}
            teamsByName={teamsByName}
          />
        </div>
        <BracketRecap
          skeleton={bracketSkeleton}
          matchState={matchState}
          teamsByName={teamsByName}
          champion={champion}
        />
        {!user && !guestPromptDismissed && (
          <div className="mt-6 text-left">
            <GuestPrompt onDismiss={() => setGuestPromptDismissed(true)} />
          </div>
        )}
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <SambaButton variant="gold" size="lg" onClick={onRestart}>{t('play.simulateAgain')}</SambaButton>
          <SambaButton variant="outline" size="lg" onClick={() => setShowShare(true)}>{t('leagues.share')}</SambaButton>
          {resultId && (
            <SambaButton variant={pinned ? 'gold' : 'outline'} size="lg" onClick={togglePin}>
              {pinned ? `\u2605 ${t('play.pinned')}` : `\u2606 ${t('play.pinResult')}`}
            </SambaButton>
          )}
        </div>
        {showShare && (
          <WorldCupShareModal
            title={title}
            hostLabel={hostLabel}
            champion={champion}
            runnerUp={runnerUpTeam}
            thirdPlace={thirdPlaceTeam}
            fourthPlace={fourthPlaceTeam}
            teamsByName={teamsByName}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    )
  }

  return null
}

function Header({ title, hostLabel, subtitle }) {
  return <NavBar title={title} subtitle={subtitle || hostLabel} />
}
