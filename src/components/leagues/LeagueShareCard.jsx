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
  ['clR16', 'leagues.zoneClR16'],
  ['clPlayoff', 'leagues.zoneClPlayoff'],
  ['clOut', 'leagues.zoneClOut'],
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
      className="inline-flex items-center justify-center rounded-full bg-white border border-white/40 overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {Custom ? (
        <Custom className="w-full h-full" />
      ) : iso ? (
        <span className={`fi fis fi-${iso} block !w-full !h-full bg-cover bg-center`} />
      ) : (
        <span className="w-full h-full bg-white/20" />
      )}
    </span>
  )
}

// Uppercase, tracked-out header row above the table body -- POS / CLUB --
// giving the graphic real table structure (like a broadcast standings
// graphic) without inventing any numeric columns we have no data for
// (predictions only carry position, never simulated match stats).
function ColumnHeader({ t }) {
  return (
    <div className="flex items-center gap-3 px-3 pb-2 border-b border-white/15">
      <span className="w-7 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 shrink-0">
        {t('leagues.tableColPos')}
      </span>
      <span className="w-9 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
        {t('leagues.tableColClub')}
      </span>
    </div>
  )
}

// One numbered row in a continuous table (not a separate card) -- hairline
// bottom divider + faint zebra banding on odd rows for legibility against
// the full-bleed gradient background, mirroring how the reference
// broadcast-style standings graphic reads. The left accent bar is the
// club's real qualification zone color (Champions League / Europa /
// Conference / relegation playoff / relegation) -- the one "extra column"
// worth of information the app can show honestly, since no fabricated
// match stats (MP/W/D/L/GF/GA/GD/Pts) exist for a position-only prediction.
function Row({ rank, club, accent, zoneColor, zebra }) {
  return (
    <div
      className={`min-h-[46px] flex items-center gap-3 px-3 py-1.5 border-b border-white/10 border-l-4 ${zebra ? 'bg-white/[0.04]' : ''}`}
      style={{ borderLeftColor: zoneColor || 'transparent' }}
    >
      <span className="w-7 text-center font-display font-extrabold text-sm text-white/70 tabular-nums shrink-0">
        {rank}
      </span>
      <ClubBadge club={club} size="sm" accent={accent} />
      <span className="flex-1 min-w-0 truncate font-display font-semibold text-white text-sm">{club.name}</span>
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
          <span key={key} className="flex items-center gap-1.5 text-xs text-white/70">
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
// overlapping.
// The card's background is the league's own brand gradient applied
// full-bleed (header through footer), and the table body reads as one
// continuous graphic (header row + hairline-divided, zebra-banded rows)
// rather than stacked white pill cards -- closer to a real broadcast
// standings table. Never uses any `dark:`-prefixed class anywhere in this
// file, so the exported image is always a consistent, legible poster no
// matter the app's current theme.
export default function LeagueShareCard({ league, nation, clubs, order }) {
  const { t } = useTranslation()
  const accent = league.colors.accent
  const rows = order.map((k, i) => {
    const rank = i + 1
    return { rank, club: clubs[k], zoneColor: getZoneForRank(league, rank)?.color }
  })

  return (
    <div
      className="w-[720px] rounded-3xl overflow-hidden shadow-depth-lg font-sans flex flex-col"
      style={{ background: `linear-gradient(160deg, ${league.colors.from}, ${league.colors.to})` }}
    >
      <div className="p-7 shrink-0">
        <div className="flex items-center gap-3">
          <LightFlag nation={nation} size={52} />
          <div>
            <p className="font-display text-3xl font-extrabold leading-tight text-white">{league.name}</p>
            <p className="text-white/80 text-xs font-semibold">{t('leagues.clubCount', { count: league.clubs.length })}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-6">
        <Legend league={league} t={t} />
        <ColumnHeader t={t} />
        <div className="flex flex-col pb-2">
          {rows.map(({ rank, club, zoneColor }, i) => club && (
            <Row key={rank} rank={rank} club={club} accent={accent} zoneColor={zoneColor} zebra={i % 2 === 1} />
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-4 flex flex-col items-center gap-1.5 shrink-0">
        <Logo className="h-8 w-auto" />
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50">MUNDIAL</p>
      </div>
    </div>
  )
}
