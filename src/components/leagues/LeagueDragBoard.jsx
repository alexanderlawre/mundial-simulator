import { useState } from 'react'
import { DndContext, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import LeagueTableSlot from './LeagueTableSlot'
import LeagueTeamPoolItem from './LeagueTeamPoolItem'
import SambaButton from '../SambaButton'
import { alphabeticalClubKeys, clubsByKey } from '../../data/leagues'
import { useTranslation } from '../../lib/i18n'

const SLOT_COUNT = 20

function PoolArea({ children, onClick, hinting }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`rounded-2xl border-2 border-dashed p-3 min-h-[4.5rem] flex flex-wrap gap-2 transition-colors
        ${isOver ? 'border-gold bg-gold/10' : hinting ? 'border-blue-500/60 bg-blue-500/5' : 'border-charcoal-900/15 dark:border-white/15'}`}
    >
      {children}
    </div>
  )
}

// The board supports two equivalent ways of moving a club: dragging (via
// dnd-kit) and click-to-select-then-click-to-place (via plain onClick
// handlers + `selected` state below). Both paths funnel into the same
// `applyMove` reducer so the fill/swap/unplace rules can never drift apart
// between the two interaction styles.
//
// A fixed-length 20-slot table (index = rank - 1, null = empty) plus an
// alphabetical pool of unplaced clubs that is NEVER stored -- always
// derived as (all club keys) minus (non-null table entries), so table and
// pool can never desync. Placing a pool club onto a slot fills it (bumping
// any club already there back to the pool); placing a filled slot onto
// another slot swaps the two (deliberately not a shift-all-rows reorder,
// which would be disorienting on a 20-row list, especially on touch);
// placing a filled slot onto the pool area unplaces it. Confirming is
// disabled until every slot is filled. Only rendered while editing -- the
// locked/confirmed view (in LeaguePredict.jsx) mounts no DndContext at
// all, so there's zero accidental-drag risk once done.
export default function LeagueDragBoard({ league, initialOrder, onConfirm }) {
  const { t } = useTranslation()
  const [table, setTable] = useState(() => initialOrder || Array(SLOT_COUNT).fill(null))
  // { type: 'pool', clubKey } | { type: 'slot', index } | null -- the
  // currently click-selected club, awaiting a target tap. Cleared after
  // every placement, deselect-tap, or re-selection of something else.
  const [selected, setSelected] = useState(null)
  const clubs = clubsByKey(league.key)
  const alphaKeys = alphabeticalClubKeys(league.key)
  const placed = new Set(table.filter(Boolean))
  const pool = alphaKeys.filter((k) => !placed.has(k))
  const allFilled = table.every((k) => k !== null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  // source: { type: 'pool', clubKey } | { type: 'slot', index }
  // targetId: 'pool' | 'slot-<n>'
  function applyMove(source, targetId) {
    if (targetId === 'pool') {
      if (source.type === 'slot') {
        setTable((prev) => {
          const next = [...prev]
          next[source.index] = null
          return next
        })
      }
      return
    }

    if (!String(targetId).startsWith('slot-')) return
    const targetIndex = Number(String(targetId).slice(5))

    if (source.type === 'pool') {
      setTable((prev) => {
        const next = [...prev]
        next[targetIndex] = source.clubKey
        return next
      })
      return
    }

    if (source.type === 'slot') {
      const sourceIndex = source.index
      if (sourceIndex === targetIndex) return
      setTable((prev) => {
        const next = [...prev]
        ;[next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]]
        return next
      })
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current
    const source =
      activeData?.type === 'slot'
        ? { type: 'slot', index: activeData.index }
        : activeData?.type === 'pool'
        ? { type: 'pool', clubKey: activeData.clubKey }
        : null
    if (!source) return
    applyMove(source, over.id)
  }

  function isSameSelection(a, b) {
    if (!a || !b || a.type !== b.type) return false
    return a.type === 'pool' ? a.clubKey === b.clubKey : a.index === b.index
  }

  function handlePoolItemClick(clubKey) {
    const source = { type: 'pool', clubKey }
    setSelected((prev) => (isSameSelection(prev, source) ? null : source))
  }

  function handleSlotClick(index) {
    const target = `slot-${index}`
    setSelected((prev) => {
      if (prev) {
        if (prev.type === 'slot' && prev.index === index) return null
        applyMove(prev, target)
        return null
      }
      // Nothing selected yet: only a filled slot can be picked up this way
      // (an empty slot has nothing to place, so tapping it alone is a no-op).
      return table[index] ? { type: 'slot', index } : null
    })
  }

  function handlePoolAreaClick() {
    setSelected((prev) => {
      if (prev && prev.type === 'slot') applyMove(prev, 'pool')
      return null
    })
  }

  return (
    <div className="space-y-5">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} autoScroll>
        {/* Pool sits beside the table (not below it) from lg upward and
            sticks in place while the long 20-row table scrolls past --
            avoids the "scroll all the way down to grab a club" hassle on
            desktop. Below lg there isn't room for a side column, so it
            falls back to stacking underneath, same as before. */}
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">
          <div className="space-y-1.5">
            {table.map((clubKey, i) => (
              <LeagueTableSlot
                key={i}
                index={i}
                club={clubKey ? clubs[clubKey] : null}
                accent={league.colors.accent}
                interactive
                europe={i < 4}
                relegation={i >= SLOT_COUNT - 3}
                selected={selected?.type === 'slot' && selected.index === i}
                onClick={() => handleSlotClick(i)}
              />
            ))}
          </div>

          <div className="mt-5 lg:mt-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-2">
            <p className="text-[11px] uppercase tracking-wide text-charcoal-600/70 dark:text-charcoal-300/70 font-semibold mb-2">
              {t('leagues.poolTitle', { count: pool.length })}
            </p>
            <PoolArea onClick={handlePoolAreaClick} hinting={selected?.type === 'slot'}>
              {pool.length === 0 ? (
                <p className="text-xs text-charcoal-600 dark:text-charcoal-300 italic px-1 py-1">{t('leagues.poolEmpty')}</p>
              ) : (
                pool.map((clubKey) => (
                  <LeagueTeamPoolItem
                    key={clubKey}
                    club={clubs[clubKey]}
                    accent={league.colors.accent}
                    selected={selected?.type === 'pool' && selected.clubKey === clubKey}
                    onClick={() => handlePoolItemClick(clubKey)}
                  />
                ))
              )}
            </PoolArea>
          </div>
        </div>
      </DndContext>

      <div className="space-y-1.5">
        <SambaButton
          variant="gold"
          className="w-full"
          disabled={!allFilled}
          onClick={() => onConfirm(table)}
        >
          {t('leagues.confirmSelections')}
        </SambaButton>
        {!allFilled && (
          <p className="text-center text-xs text-charcoal-600 dark:text-charcoal-300">
            {t('leagues.confirmRequiresAll', { count: pool.length })}
          </p>
        )}
      </div>
    </div>
  )
}
