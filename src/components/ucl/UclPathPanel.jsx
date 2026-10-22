import ClubBadge from '../leagues/ClubBadge'
import { useTranslation } from '../../lib/i18n'
import { KO_ROUND_LABEL_KEY, pathForClub } from '../../lib/uclEngine'

// Clubs that could occupy `slot` of `tieId`, honouring an optional set of
// revealed play-off ties (undrawn play-offs stay hidden).
function contenders(bracket, tieId, slot, drawn) {
  const tie = bracket.ties[tieId]
  if (tie.round === 'playoff') {
    if (drawn && !drawn.has(tieId)) return []
    return tie[slot] ? [tie[slot]] : []
  }
  if (tie[slot]) return [tie[slot]]
  const out = []
  Object.entries(bracket.advancesTo)
    .filter(([, n]) => n.id === tieId && n.slot === slot)
    .forEach(([from]) => {
      const ft = bracket.ties[from]
      if (ft.result) out.push(ft.result.winner)
      else {
        out.push(...contenders(bracket, from, 'a', drawn))
        out.push(...contenders(bracket, from, 'b', drawn))
      }
    })
  return out
}

export default function UclPathPanel({ bracket, clubs, clubKey, drawnTieIds = null }) {
  const { t } = useTranslation()
  const club = clubs[clubKey]
  if (!club) return null
  const path = pathForClub(bracket, clubKey)
  const first = bracket.ties[path[0]]
  const hidden = first.round === 'playoff' && drawnTieIds && !drawnTieIds.has(first.id)

  let mySlot = first.a === clubKey ? 'a' : 'b'
  const rows = path.map((id, i) => {
    if (i > 0) mySlot = bracket.advancesTo[path[i - 1]].slot
    const other = mySlot === 'a' ? 'b' : 'a'
    const opts = [...new Set(contenders(bracket, id, other, drawnTieIds))]
    return { id, round: bracket.ties[id].round, opts }
  })

  return (
    <div className="rounded-2xl bg-white dark:bg-night-card shadow-depth p-4 animate-slide-up">
      <div className="flex items-center gap-3 mb-3">
        <ClubBadge club={club} size="md" />
        <h3 className="font-display font-bold text-charcoal-900 dark:text-sand">{t('ucl.pathTitle', { club: club.name })}</h3>
      </div>
      {hidden ? (
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{t('ucl.notDrawnYet')}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-3 text-sm">
              <span className="w-28 shrink-0 text-[11px] uppercase tracking-wide font-semibold text-charcoal-600 dark:text-charcoal-300 pt-1">
                {t(KO_ROUND_LABEL_KEY[row.round])}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-charcoal-900 dark:text-sand">
                <span className="text-xs text-charcoal-600 dark:text-charcoal-300">{t('play.vs')}</span>
                {row.opts.length === 0 && <span className="italic text-charcoal-600/70 dark:text-charcoal-300/70">{t('play.tbd')}</span>}
                {row.opts.slice(0, 6).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-sand dark:bg-night px-2 py-0.5">
                    <ClubBadge club={clubs[k]} size="xs" />
                    <span className="text-xs">{clubs[k].name}</span>
                  </span>
                ))}
                {row.opts.length > 6 && <span className="text-xs text-charcoal-600 dark:text-charcoal-300">+{row.opts.length - 6}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
