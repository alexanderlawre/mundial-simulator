import ClubBadge from './ClubBadge'
import { getZoneForRank } from '../../data/leagues'
import Logo from '../common/Logo'
import { useTranslation } from '../../lib/i18n'

// Same zone display order as ZoneLegend in LeaguePredict.jsx, kept in sync
// so the exported card's legend always matches what's shown on the actual
// prediction page above the table.
const ZONE_LABEL_ORDER = [
  ['ucl', 'leagues.zoneUcl'],
  ['uclQualifying', 'leagues.zoneUclQualifying'],
  ['uel', 'leagues.zoneUel'],
  ['uecl', 'leagues.zoneUecl'],
  ['libertadores', 'leagues.zoneLibertadores'],
  ['sudamericana', 'leagues.zoneSudamericana'],
  ['relegationPlayoff', 'leagues.zoneRelegationPlayoff'],
  ['relegation', 'leagues.zoneRelegation'],
]

// A minimal, ALWAYS-LIGHT inline flag renderer -- deliberately not reusing
// CountryFlag.jsx here, since that component carries `dark:` frame classes
// that would leak the user's current app theme into this share "poster"
// via the ancestor .dark class on <html> (Tailwind dark-mode selectors
// aren't scoped to a component subtree, only to real DOM ancestry).
function LightFlag({ nation, size = 40 }) {
  if (!nation) return null
  const Custom = nation.customFlag
  const iso = (nation.iso2 || '').toLowerCase()
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-white border border-charcoal-900/10 overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {Custom ? (
        <Custom className="w-full h-full" />
      ) : iso ? (
        <span className={`fi fis fi-${iso} block !w-full !h-full bg-cover bg-center`} />
      ) : (
        <span className="w-full h-full bg-charcoal-100" />
      )}
    </span>
  )
}

// One numbered row, light-only, badge + name. Fixed, generous min-height
// (rather than a flex-1 equal-share of a fixed total page height) so a
// club's crest and name always render at their real, legible size no
// matter how many clubs the league has -- the card grows taller instead of
// squeezing every row shorter than its own content, which is what used to
// cause crests/text to overflow their row and visually overlap the row
// below on 18-20 club leagues.
// Mirrors PredictedTableRow (PredictedTableView.jsx) exactly -- plain white
// row, left border is the club's real qualification zone color (Champions
// League / Europa / Conference / relegation playoff / relegation) -- so the
// exported "poster" matches what's actually shown on the prediction page,
// with no extra gold/silver/bronze podium styling that doesn't exist there.
function Row({ rank, club, accent, zoneColor }) {
  return (
    <div
      className="min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-charcoal-900/10 border-l-4"
      style={{ borderLeftColor: zoneColor || 'transparent' }}
    >
      <span className="w-7 text-center font-display font-extrabold text-sm text-charcoal-900 tabular-nums shrink-0">
        {rank}
      </span>
      <ClubBadge club={club} size="sm" accent={accent} />
      <span className="flex-1 min-w-0 truncate font-display font-semibold text-charcoal-900 text-sm">{club.name}</span>
    </div>
  )
}

// Light-only mirror of ZoneLegend (LeaguePredict.jsx) -- the colored-dot
// legend row shown above the table on the actual prediction page. Included
// here so the exported card carries the same context (what each border
// color means) instead of leaving unlabeled colored bars.
function Legend({ league, t }) {
  if (!league.zones?.length) return null
  const present = ZONE_LABEL_ORDER.filter(([key]) => league.zones.some((z) => z.key === key))
  if (!present.length) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 pb-3">
      {present.map(([key, labelKey]) => {
        const z = league.zones.find((zz) => zz.key === key)
        return (
          <span key={key} className="flex items-center gap-1.5 text-xs text-charcoal-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
            {t(labelKey)}
          </span>
        )
      })}
    </div>
  )
}

// Portrait "paper" share card rendered off-screen by LeagueShareModal.jsx
// and captured to a structured JPEG via shareImage.js. Fixed WIDTH only
// (720px) -- height is intentionally natural/auto, growing with however
// many rows the league has, rather than forced into a fixed aspect ratio.
// Squeezing every league (18 clubs, 20 clubs, ...) into the same total
// height is exactly what caused crests/names to compress and overlap
// before; letting the card grow instead keeps every row at a fixed,
// legible size with crests, names, and positions always in order and never
// overlapping. Deliberately mirrors the real on-page predicted-table UI
// (PredictedTableView.jsx + the ZoneLegend/header in LeaguePredict.jsx)
// exactly -- same club-count subtitle, same zone legend, same plain
// zone-color-bordered rows with no extra podium styling -- so the exported
// image always matches what the user actually sees in the app. Never uses
// any `dark:`-prefixed class anywhere in this file, so the exported image
// is always a consistent, legible light "poster" no matter the app's
// current theme.
export default function LeagueShareCard({ league, nation, clubs, order }) {
  const { t } = useTranslation()
  const accent = league.colors.accent
  const rows = order.map((k, i) => {
    const rank = i + 1
    return { rank, club: clubs[k], zoneColor: getZoneForRank(league, rank)?.color }
  })

  return (
    <div className="w-[720px] bg-[#F4EFE6] rounded-3xl overflow-hidden shadow-depth-lg font-sans flex flex-col">
      <div
        className="p-7 text-white shrink-0"
        style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
      >
        <div className="flex items-center gap-3">
          <LightFlag nation={nation} size={52} />
          <div>
            <p className="font-display text-3xl font-extrabold leading-tight">{league.name}</p>
            <p className="text-white/80 text-xs font-semibold">{t('leagues.clubCount', { count: league.clubs.length })}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-6 pt-4">
        <Legend league={league} t={t} />
        <div className="flex flex-col gap-1.5 pb-2">
          {rows.map(({ rank, club, zoneColor }) => club && (
            <Row key={rank} rank={rank} club={club} accent={accent} zoneColor={zoneColor} />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 flex flex-col items-center gap-1.5 shrink-0">
        <Logo className="h-8 w-auto" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal-600/50">MUNDIAL</p>
      </div>
    </div>
  )
}
