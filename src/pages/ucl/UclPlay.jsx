import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBackground from '../../components/common/AppBackground'
import NavBar from '../../components/common/NavBar'
import SambaButton from '../../components/common/SambaButton'
import ClubBadge from '../../components/leagues/ClubBadge'
import UclLeagueTable from '../../components/ucl/UclLeagueTable'
import UclBracketView from '../../components/ucl/UclBracketView'
import UclPathPanel from '../../components/ucl/UclPathPanel'
import UclTieSimModal from '../../components/ucl/UclTieSimModal'
import UclTrophyScene from '../../components/ucl/UclTrophyScene'
import { UCL_FIELD_SIZE, uclClubByKey } from '../../data/uclClubs'
import {
  applyTieResult,
  computeLeagueTable,
  drawKnockoutBracket,
  buildManualMatch,
  nextPlayableTieId,
  playTie,
  playTieWithWinner,
  simulateClubMatch,
  simulateClubMatchWithOutcome,
} from '../../lib/uclEngine'
import { useTranslation } from '../../lib/i18n'

function Scorers({ scorers, align }) {
  if (!scorers?.length) return <div />
  return (
    <ul className={`text-[11px] text-charcoal-600 dark:text-charcoal-300 space-y-0.5 ${align === 'right' ? 'text-right' : ''}`}>
      {scorers.map((s, i) => (
        <li key={i} className="tabular-nums">{s.name} {s.minute}&apos;</li>
      ))}
    </ul>
  )
}

function ResultCard({ home, away, result, title }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-4 animate-slide-up">
      <p className="text-center text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 mb-2">{title}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-1 min-w-0 text-center">
          <ClubBadge club={home} size="md" />
          <span className="text-sm font-semibold text-charcoal-900 dark:text-sand truncate max-w-full">{home.name}</span>
        </div>
        <span className="font-display font-extrabold text-3xl tabular-nums text-charcoal-900 dark:text-sand animate-pop-in">
          {result.homeGoals}&ndash;{result.awayGoals}
        </span>
        <div className="flex flex-col items-center gap-1 min-w-0 text-center">
          <ClubBadge club={away} size="md" />
          <span className="text-sm font-semibold text-charcoal-900 dark:text-sand truncate max-w-full">{away.name}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Scorers scorers={result.homeScorers} />
        <Scorers scorers={result.awayScorers} align="right" />
      </div>
    </div>
  )
}

function ScoreInput({ value, onChange, label }) {
  return (
    <input
      type="number"
      min="0"
      max="20"
      inputMode="numeric"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-12 text-center rounded-lg border border-charcoal-900/15 dark:border-white/15 bg-white dark:bg-night-card py-1 text-sm font-display font-bold tabular-nums text-charcoal-900 dark:text-sand"
    />
  )
}

// One fixture. Unplayed rows offer Play (simulate) and Set (choose the
// outcome or type a score); played rows can be re-edited by tapping the score.
function FixtureRow({ f, result, clubByKey, onPlay, onOutcome, onScore, editing, onToggleEdit, highlight }) {
  const { t } = useTranslation()
  const home = clubByKey[f.home]
  const away = clubByKey[f.away]
  const [hg, setHg] = useState(result ? String(result.homeGoals) : '')
  const [ag, setAg] = useState(result ? String(result.awayGoals) : '')
  const valid = hg !== '' && ag !== '' && Number(hg) >= 0 && Number(ag) >= 0
  return (
    <div className={`rounded-lg ${highlight ? 'bg-gold/20' : ''}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 px-2">
        <span className="flex items-center gap-1.5 justify-end min-w-0">
          <span className={`truncate text-xs sm:text-sm text-right ${result && result.homeGoals > result.awayGoals ? 'font-bold' : ''} text-charcoal-900 dark:text-sand`}>{home.name}</span>
          <ClubBadge club={home} size="xs" lazy />
        </span>
        {result ? (
          <button
            type="button"
            onClick={() => onToggleEdit(f.id)}
            title={t('ucl.editResult')}
            className="min-w-[3.25rem] text-center font-display font-bold tabular-nums text-sm text-charcoal-900 dark:text-sand rounded-md hover:bg-sand dark:hover:bg-night"
          >
            {result.homeGoals}&ndash;{result.awayGoals}
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPlay(f)}
              className="px-2 py-0.5 rounded-md bg-mint text-emerald text-[11px] font-display font-semibold hover:bg-mint/80"
            >
              {t('ucl.playMatch')}
            </button>
            <button
              type="button"
              onClick={() => onToggleEdit(f.id)}
              className="px-2 py-0.5 rounded-md border border-charcoal-900/15 dark:border-white/15 text-charcoal-900 dark:text-sand text-[11px] font-display font-semibold hover:bg-sand dark:hover:bg-night"
            >
              {t('ucl.setResult')}
            </button>
          </span>
        )}
        <span className="flex items-center gap-1.5 min-w-0">
          <ClubBadge club={away} size="xs" lazy />
          <span className={`truncate text-xs sm:text-sm ${result && result.awayGoals > result.homeGoals ? 'font-bold' : ''} text-charcoal-900 dark:text-sand`}>{away.name}</span>
        </span>
      </div>
      {editing && (
        <div className="mx-2 mb-2 rounded-lg bg-sand/70 dark:bg-night/70 p-2 space-y-2 animate-slide-up">
          <div className="flex flex-wrap justify-center gap-1.5">
            <button type="button" onClick={() => onOutcome(f, 'home')} className="px-2.5 py-1 rounded-lg bg-mint text-emerald text-xs font-display font-semibold hover:bg-mint/80">{t('ucl.homeWin')}</button>
            <button type="button" onClick={() => onOutcome(f, 'draw')} className="px-2.5 py-1 rounded-lg bg-mint text-emerald text-xs font-display font-semibold hover:bg-mint/80">{t('compete.draw')}</button>
            <button type="button" onClick={() => onOutcome(f, 'away')} className="px-2.5 py-1 rounded-lg bg-mint text-emerald text-xs font-display font-semibold hover:bg-mint/80">{t('ucl.awayWin')}</button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-charcoal-600 dark:text-charcoal-300">{t('ucl.exactScore')}</span>
            <ScoreInput value={hg} onChange={setHg} label={home.name} />
            <span className="text-charcoal-600 dark:text-charcoal-300">&ndash;</span>
            <ScoreInput value={ag} onChange={setAg} label={away.name} />
            <button
              type="button"
              disabled={!valid}
              onClick={() => onScore(f, Number(hg), Number(ag))}
              className="px-3 py-1 rounded-lg bg-emerald text-white text-xs font-display font-semibold disabled:opacity-40"
            >
              {t('ucl.saveResult')}
            </button>
            <button type="button" onClick={() => onToggleEdit(null)} className="px-2 py-1 text-xs text-charcoal-600 dark:text-charcoal-300 hover:underline">{t('play.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UclPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { clubKeys, fixtures } = location.state || {}
  const valid =
    Array.isArray(clubKeys) &&
    clubKeys.length === UCL_FIELD_SIZE &&
    Array.isArray(fixtures) &&
    fixtures.length > 0 &&
    clubKeys.every((k) => uclClubByKey[k])

  const clubs = useMemo(() => (valid ? clubKeys.map((k) => uclClubByKey[k]) : []), [valid, clubKeys])
  const clubByKey = useMemo(() => Object.fromEntries(clubs.map((c) => [c.key, c])), [clubs])

  const [phase, setPhase] = useState('league') // league | kodraw | ko
  const [results, setResults] = useState({})
  const [latest, setLatest] = useState(null)
  const [dayTab, setDayTab] = useState(null)
  const [selectedClub, setSelectedClub] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const [bracket, setBracket] = useState(null)
  const [drawnTieIds, setDrawnTieIds] = useState(() => new Set())
  const [drawingTie, setDrawingTie] = useState(null) // { tieId, flip }
  const [sim, setSim] = useState(null) // { tieId, result }
  const [trophyOpen, setTrophyOpen] = useState(false)
  const flipTimer = useRef(null)

  const table = useMemo(() => (valid ? computeLeagueTable(clubs, fixtures, results) : []), [valid, clubs, fixtures, results])
  const rankByKey = useMemo(() => Object.fromEntries(table.map((r, i) => [r.key, i + 1])), [table])

  useEffect(() => () => clearInterval(flipTimer.current), [])

  if (!valid) {
    return (
      <AppBackground>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-charcoal-600 dark:text-charcoal-300 mb-4">{t('ucl.noTournament')}</p>
          <SambaButton onClick={() => navigate('/ucl/setup')}>{t('play.backToSetup')}</SambaButton>
        </div>
      </AppBackground>
    )
  }

  const totalMatchdays = Math.max(...fixtures.map((f) => f.matchday))
  const playedCount = Object.keys(results).length
  const leagueDone = playedCount === fixtures.length
  const nextFixture = fixtures.find((f) => !results[f.id]) || null
  const currentDay = nextFixture ? nextFixture.matchday : totalMatchdays
  const activeDay = dayTab || currentDay

  function playFixtures(list) {
    if (!list.length) return
    const batch = {}
    let last = null
    list.forEach((f) => {
      const r = simulateClubMatch(clubByKey[f.home], clubByKey[f.away])
      batch[f.id] = r
      last = { f, result: r }
    })
    setResults((prev) => ({ ...prev, ...batch }))
    setLatest(last)
  }

  const playNext = () => nextFixture && playFixtures([nextFixture])
  const playMatchday = () => nextFixture && playFixtures(fixtures.filter((f) => f.matchday === nextFixture.matchday && !results[f.id]))
  const playAll = () => playFixtures(fixtures.filter((f) => !results[f.id]))

  // User-chosen results: pick the outcome (a matching scoreline is generated)
  // or type an exact score. Either replaces any earlier result for the fixture.
  function setFixtureResult(f, result) {
    setResults((prev) => ({ ...prev, [f.id]: result }))
    setLatest({ f, result })
    setEditingId(null)
  }
  function chooseOutcome(f, outcome) {
    setFixtureResult(f, simulateClubMatchWithOutcome(clubByKey[f.home], clubByKey[f.away], outcome))
  }
  function enterScore(f, hg, ag) {
    setFixtureResult(f, buildManualMatch(clubByKey[f.home], clubByKey[f.away], hg, ag))
  }
  const toggleEdit = (id) => setEditingId((cur) => (cur === id ? null : id))
  const fixtureProps = {
    clubByKey,
    onPlay: (x) => playFixtures([x]),
    onOutcome: chooseOutcome,
    onScore: enterScore,
    onToggleEdit: toggleEdit,
  }

  // ---- knockout draw ----
  function startKnockoutDraw() {
    const order = table.map((r) => r.key)
    setBracket(drawKnockoutBracket(order))
    setDrawnTieIds(new Set())
    setSelectedClub(null)
    setPhase('kodraw')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function drawNextTie() {
    if (!bracket || drawingTie) return
    const nextId = bracket.playoffTieIds.find((id) => !drawnTieIds.has(id))
    if (!nextId) return
    const tie = bracket.ties[nextId]
    const candidates = [tie.a, ...bracket.playoffTieIds.filter((id) => bracket.ties[id].group === tie.group && id !== nextId).map((id) => bracket.ties[id].a)]
    let step = 0
    setDrawingTie({ tieId: nextId, show: candidates[1] || candidates[0] })
    clearInterval(flipTimer.current)
    flipTimer.current = setInterval(() => {
      step++
      if (step > 10) {
        clearInterval(flipTimer.current)
        setDrawnTieIds((prev) => new Set(prev).add(nextId))
        setDrawingTie(null)
        return
      }
      setDrawingTie({ tieId: nextId, show: candidates[step % candidates.length] })
    }, 110)
  }

  function revealAllTies() {
    clearInterval(flipTimer.current)
    setDrawingTie(null)
    setDrawnTieIds(new Set(bracket.playoffTieIds))
  }

  const allDrawn = bracket ? bracket.playoffTieIds.every((id) => drawnTieIds.has(id)) : false

  // ---- knockout play ----
  function startSimulation(tieId) {
    if (sim) return
    const result = playTie(bracket.ties[tieId], clubByKey, rankByKey)
    setSim({ tieId, result })
  }

  function pickWinner(tieId, winnerKey) {
    if (sim) return
    const result = playTieWithWinner(bracket.ties[tieId], clubByKey, rankByKey, winnerKey)
    setSim({ tieId, result })
  }

  function commitSimulation() {
    const { tieId, result } = sim
    setBracket((b) => applyTieResult(b, tieId, result))
    setSim(null)
    if (tieId === 'final') setTrophyOpen(true)
  }

  const champion = bracket?.ties.final.result ? clubByKey[bracket.ties.final.result.winner] : null
  const finalResult = bracket?.ties.final.result || null
  const runnerUp = finalResult ? clubByKey[finalResult.winner === finalResult.teamA ? finalResult.teamB : finalResult.teamA] : null
  const nextTieId = bracket ? nextPlayableTieId(bracket) : null
  const pathClub = selectedClub && bracket && clubByKey[selectedClub] ? selectedClub : null

  const card = 'rounded-2xl bg-white dark:bg-night-card shadow-depth'

  // =============== KNOCKOUT DRAW + KNOCKOUT PLAY ===============
  if ((phase === 'kodraw' || phase === 'ko') && bracket) {
    const inDraw = phase === 'kodraw'
    const drawingClubs = drawingTie ? bracket.ties[drawingTie.tieId] : null
    return (
      <AppBackground>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-[15rem]">
              <NavBar
                title={inDraw ? t('ucl.knockoutDrawTitle') : t('ucl.knockoutPhase')}
                subtitle={inDraw ? t('ucl.knockoutDrawSubtitle') : t('ucl.knockoutSubtitle')}
                onBack={inDraw ? () => setPhase('league') : () => navigate('/tournaments')}
              />
            </div>
            {inDraw && (
              <div className="flex gap-2 flex-wrap">
                {!allDrawn && (
                  <>
                    <SambaButton variant="gold" size="sm" disabled={!!drawingTie} onClick={drawNextTie}>{t('ucl.drawNextTie')}</SambaButton>
                    <SambaButton variant="outline" size="sm" onClick={revealAllTies}>{t('ucl.drawAllTies')}</SambaButton>
                  </>
                )}
                {allDrawn && (
                  <SambaButton variant="primary" size="sm" onClick={() => { setPhase('ko'); setSelectedClub(null) }}>
                    {t('ucl.startKnockouts')}
                  </SambaButton>
                )}
              </div>
            )}
          </div>

          {inDraw && drawingTie && drawingClubs && (
            <div className={`${card} p-4 animate-slide-up`}>
              <p className="text-center text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 mb-3">
                {t('ucl.drawing')} &middot; {t('ucl.playoffTieLabel', { id: drawingTie.tieId.replace('po-', '') })}
              </p>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <ClubBadge club={clubByKey[drawingClubs.b]} size="lg" />
                  <span className="text-xs font-semibold text-charcoal-900 dark:text-sand">{clubByKey[drawingClubs.b].name}</span>
                  <span className="text-[10px] uppercase text-charcoal-600 dark:text-charcoal-300">{t('ucl.seededLabel')}</span>
                </div>
                <span className="font-display font-bold text-charcoal-600 dark:text-charcoal-300">{t('play.vs')}</span>
                <div className="flex flex-col items-center gap-1 animate-kickoff-pulse">
                  <ClubBadge club={clubByKey[drawingTie.show]} size="lg" />
                  <span className="text-xs font-semibold text-charcoal-900 dark:text-sand">{clubByKey[drawingTie.show].name}</span>
                  <span className="text-[10px] uppercase text-charcoal-600 dark:text-charcoal-300">{t('ucl.unseededLabel')}</span>
                </div>
              </div>
            </div>
          )}

          {!inDraw && champion && (
            <div className={`${card} p-4 flex items-center justify-between gap-3 flex-wrap animate-slide-up`}>
              <div className="flex items-center gap-3 min-w-0">
                <ClubBadge club={champion} size="lg" />
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg text-charcoal-900 dark:text-sand truncate">{champion.name}</p>
                  <p className="text-sm text-gold font-semibold">{t('ucl.championsTitle')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <SambaButton variant="gold" size="sm" onClick={() => setTrophyOpen(true)}>{t('ucl.viewTrophy')}</SambaButton>
                <SambaButton variant="outline" size="sm" onClick={() => navigate('/ucl/setup')}>{t('ucl.playAgain')}</SambaButton>
              </div>
            </div>
          )}

          <p className="text-xs text-charcoal-600 dark:text-charcoal-300">
            {t('ucl.tapClubForPath')}
            {!inDraw && ` ${t('ucl.knockoutPickHint')}`}
          </p>

          <div className={`${card} p-3 sm:p-4`}>
            <UclBracketView
              bracket={bracket}
              clubs={clubByKey}
              selectedClub={pathClub}
              onSelectClub={(k) => setSelectedClub((cur) => (cur === k ? null : k))}
              drawnTieIds={inDraw ? drawnTieIds : null}
              nextTieId={nextTieId}
              busyTieId={sim?.tieId || null}
              onSimulate={inDraw ? undefined : startSimulation}
              onPickWinner={inDraw ? undefined : pickWinner}
            />
          </div>

          {pathClub && <UclPathPanel bracket={bracket} clubs={clubByKey} clubKey={pathClub} drawnTieIds={inDraw ? drawnTieIds : null} />}
        </div>

        {sim && (
          <UclTieSimModal
            key={sim.tieId}
            tie={bracket.ties[sim.tieId]}
            result={sim.result}
            clubs={clubByKey}
            onDone={commitSimulation}
          />
        )}
        {trophyOpen && champion && (
          <UclTrophyScene
            champion={champion}
            runnerUp={runnerUp}
            finalResult={finalResult}
            onClose={() => setTrophyOpen(false)}
            onPlayAgain={() => navigate('/ucl/setup')}
          />
        )}
      </AppBackground>
    )
  }

  // =============== LEAGUE PHASE ===============
  const clubFixtures = selectedClub ? fixtures.filter((f) => f.home === selectedClub || f.away === selectedClub) : null
  const dayFixtures = fixtures.filter((f) => f.matchday === activeDay)

  return (
    <AppBackground>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
        <NavBar
          title={t('ucl.leaguePhase')}
          subtitle={`${t('ucl.matchdayOf', { current: currentDay, total: totalMatchdays })} · ${t('ucl.matchesPlayed', { played: playedCount, total: fixtures.length })}`}
          onBack={() => navigate('/ucl/draw', { state: { clubKeys } })}
        />

        <p className="text-xs text-charcoal-600 dark:text-charcoal-300">{t('ucl.leagueEditHint')}</p>

        {!leagueDone ? (
          <div className="flex flex-wrap gap-2">
            <SambaButton variant="gold" size="sm" onClick={playNext}>{t('ucl.simulateNextMatch')}</SambaButton>
            <SambaButton variant="secondary" size="sm" onClick={playMatchday}>{t('ucl.simulateMatchday')}</SambaButton>
            <SambaButton variant="outline" size="sm" onClick={playAll}>{t('ucl.simulateLeaguePhase')}</SambaButton>
          </div>
        ) : (
          <div className={`${card} p-4 flex items-center justify-between gap-3 flex-wrap animate-slide-up`}>
            <p className="font-display font-semibold text-charcoal-900 dark:text-sand">{t('ucl.leaguePhaseComplete')}</p>
            <SambaButton variant="gold" onClick={startKnockoutDraw}>{t('ucl.continueToKnockoutDraw')}</SambaButton>
          </div>
        )}

        {latest && (
          <ResultCard
            key={latest.f.id}
            home={clubByKey[latest.f.home]}
            away={clubByKey[latest.f.away]}
            result={latest.result}
            title={`${t('ucl.latestResult')} · ${t('ucl.matchdayN', { number: latest.f.matchday })}`}
          />
        )}

        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5 items-start">
          <div className="space-y-2">
            <UclLeagueTable
              rows={table}
              clubs={clubByKey}
              selectedClub={selectedClub}
              onSelect={(k) => setSelectedClub((cur) => (cur === k ? null : k))}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-charcoal-600 dark:text-charcoal-300 px-1">
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />{t('leagues.zoneClR16')}</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#6ee7b7]" />{t('leagues.zoneClPlayoff')}</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />{t('leagues.zoneClOut')}</span>
            </div>
          </div>

          <div className={`${card} p-3`}>
            {clubFixtures ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-display font-semibold text-charcoal-900 dark:text-sand truncate">{clubByKey[selectedClub].name}</p>
                  <button type="button" onClick={() => setSelectedClub(null)} className="text-xs text-emerald font-semibold hover:underline shrink-0">
                    {t('ucl.showMatchdays')}
                  </button>
                </div>
                {clubFixtures.map((f) => (
                  <div key={f.id}>
                    <p className="text-[10px] uppercase tracking-wide text-charcoal-600 dark:text-charcoal-300 px-2 pt-1">{t('ucl.matchdayN', { number: f.matchday })}</p>
                    <FixtureRow key={`${f.id}-${results[f.id] ? `${results[f.id].homeGoals}-${results[f.id].awayGoals}` : 'p'}`} f={f} result={results[f.id]} {...fixtureProps} editing={editingId === f.id} highlight={f.home === selectedClub || f.away === selectedClub} />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-1 mb-2">
                  {Array.from({ length: totalMatchdays }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayTab(d)}
                      className={`w-8 h-8 rounded-lg text-sm font-display font-semibold transition-colors ${
                        activeDay === d ? 'bg-emerald text-white' : 'bg-sand dark:bg-night text-charcoal-900 dark:text-sand hover:bg-mint dark:hover:bg-emerald/30'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 px-2 mb-1">{t('ucl.matchdayN', { number: activeDay })}</p>
                {dayFixtures.map((f) => (
                  <FixtureRow key={`${f.id}-${results[f.id] ? `${results[f.id].homeGoals}-${results[f.id].awayGoals}` : 'p'}`} f={f} result={results[f.id]} {...fixtureProps} editing={editingId === f.id} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </AppBackground>
  )
}
