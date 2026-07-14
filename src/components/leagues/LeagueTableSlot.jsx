import { useDraggable, useDroppable } from '@dnd-kit/core'
import ClubBadge from './ClubBadge'
import { useTranslation } from '../../lib/i18n'

// One numbered table row: rank, then either the placed club (badge + name,
// draggable to swap with another slot or unplace back to the pool) or a
// dashed "empty slot" placeholder (droppable only) -- reusing the dashed
// -circle "TBD" visual language already established by BracketTree.jsx.
// A slot is simultaneously a drop target (useDroppable, always, so a pool
// club or another slot's club can land here) and, only once filled, also a
// drag source (useDraggable) -- both hooks share the same DOM node. It's
// also always a click target (onClick, when interactive) so the parent can
// offer click-to-select/click-to-place as an alternative to dragging.
export default function LeagueTableSlot({ index, club, accent, interactive, relegation, europe, selected, onClick }) {
  const { t } = useTranslation()
  const slotId = `slot-${index}`
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: slotId, disabled: !interactive })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: slotId,
    disabled: !interactive || !club,
    data: { type: 'slot', index },
  })

  function setRefs(node) {
    setDropRef(node)
    setDragRef(node)
  }

  const rank = index + 1
  const dragProps = interactive && club ? { ...listeners, ...attributes } : {}

  return (
    <div
      ref={setRefs}
      {...dragProps}
      onClick={interactive ? onClick : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all touch-none
        ${isOver ? 'ring-2 ring-gold bg-gold/10' : selected ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500' : 'bg-white/90 dark:bg-night-card/90 border-charcoal-900/10 dark:border-white/10'}
        ${isDragging ? 'opacity-30' : ''}
        ${interactive && club ? 'cursor-grab active:cursor-grabbing' : interactive ? 'cursor-pointer' : ''}
        ${relegation ? 'border-l-4 border-l-red-500/70' : ''}
        ${europe ? 'border-l-4 border-l-emerald' : ''}
      `}
    >
      <span className="w-6 text-center font-display font-bold text-sm text-charcoal-600 dark:text-charcoal-300 tabular-nums shrink-0">
        {rank}
      </span>
      {club ? (
        <>
          <ClubBadge club={club} size="sm" accent={accent} />
          <span className="flex-1 min-w-0 truncate font-medium text-charcoal-900 dark:text-sand text-sm">{club.name}</span>
        </>
      ) : (
        <>
          <span className="w-6 h-6 rounded-lg border-2 border-dashed border-charcoal-900/20 dark:border-white/20 shrink-0" />
          <span className="flex-1 text-xs text-charcoal-600 dark:text-charcoal-300 italic">{t('leagues.emptySlot')}</span>
        </>
      )}
    </div>
  )
}
