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
    <div className="flex items-center gap-4 px-4 pb-3 border-b border-white/15">
      <span className="w-9 text-center text-xs font-bold uppercase tracking-[0.15em] text-white/60 shrink-0">
        {t('leagues.tableColPos')}
      </span>
      <span className="w-12 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-xs font-bold uppercase tracking-[0.15em] text-white/60">
        {t('leagues.tableColClub')}
      </span>
    </div>
  )
}

// One numbered row in a continuous table (not a separate card) -- a plain,
// flat row with just a hairline bottom divider, no zebra banding. A
// diagonal two-hue gradient card background plus alternating translucent
// stripes plus per-badge drop shadows all fighting for attention was what
// made the previous version read as noisy/muddy rather than a clean
// broadcast-style graphic -- every row here now sits on the exact same flat
// color, so only real signal (rank, crest, name, zone color) breaks up the
// row, not decoration. The left accent bar is the club's real qualification
// zone color (Champions League / Europa / Conference / relegation playoff /
// relegation) -- the one "extra column" worth of information the app can
// show honestly, since no fabricated match stats (MP/W/D/L/GF/GA/GD/Pts)
// exist for a position-only prediction.
function Row({ rank, club, accent, zoneColor }) {
  return (
    <div
      className="min-h-[68px] flex items-center gap-4 px-4 py-3 border-b border-white/10 border-l-4"
      style={{ borderLeftColor: zoneColor || 'transparent' }}
    >
      <span className="w-9 text-center font-display font-extrabold text-base text-white/70 tabular-nums shrink-0">
        {rank}
      </span>
      <ClubBadge club={club} size="md" accent={accent} />
      <span className="flex-1 min-w-0 truncate font-display font-bold text-white text-base">{club.name}</span>
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
    <div className="flex flex-wrap gap-x-5 gap-y-2 px-1 pb-4">
      {present.map(([key, labelKey]) => {
        const z = league.zones.find((zz) => zz.key === key)
        return (
          <span key={key} className="flex items-center gap-2 text-sm text-white/70">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
            {t(labelKey)}
          </span>
        )
      })}
    </div>
  )
}

// Portrait "paper" share card rendered off-screen by LeagueShareModal.jsx
// and captured to a structured JPEG via shareImage.js. Fixed WIDTH only
// (880px, wide enough that a standard 18-20 club league lands close to a
// letter-page portrait proportion) -- height is intentionally natural/auto,
// growing with however many rows the league has, rather than forced into a
// fixed aspect ratio. Squeezing every league (18 clubs, 20 clubs, ..., 36
// for Champions League) into the same total height is exactly what caused
// crests/names to compress, overlap, and truncate before; letting the card
// grow instead keeps every row at a fixed, legible size (48px crest, 16px
// name) with crests, names, and positions always in order, never
// overlapping or clipped. A 36-club league will run taller than a single
// printed page -- there's no width/row-size combination that fits both a
// legible 20-row Premier League table AND a legible 36-row Champions
// League table onto one identical letter-shaped rectangle, so legibility
// (nothing cramped or cut off) wins over hitting an exact 8.5x11 ratio for
// every league.
// The card's background is a single flat fill in the league's own primary
// brand color (`colors.from`), applied full-bleed header through footer --
// deliberately NOT a two-hue diagonal gradient. A couple of leagues here
// have a `from`/`to` pair that are very different hues (e.g. Brasileirão's
// green-to-yellow), and stretching that across a tall 20+ row card reads as
// a noisy, unevenly-lit background that fights with the badges/text sitting
// on top of it rather than a clean, print-like broadcast graphic -- exactly
// what a flat fill (like the reference standings graphic) avoids. The table
// body reads as one continuous graphic (header row + hairline-divided
// rows, no zebra banding) rather than stacked white pill cards. Never uses
// any `dark:`-prefixed class anywhere in this file, so the exported image
// is always a consistent, legible poster no matter the app's current theme.
export default function LeagueShareCard({ league, nation, clubs, order }) {
  const { t } = useTranslation()
  const accent = league.colors.accent
  const rows = order.map((k, i) => {
    const rank = i + 1
    return { rank, club: clubs[k], zoneColor: getZoneForRank(league, rank)?.color }
  })

  return (
    <div
      className="w-[880px] rounded-3xl overflow-hidden shadow-depth-lg font-sans flex flex-col"
      style={{ backgroundColor: league.colors.from }}
    >
      <div className="p-8 shrink-0">
        <div className="flex items-center gap-4">
          <LightFlag nation={nation} size={60} />
          <div>
            <p className="font-display text-4xl font-extrabold leading-tight text-white">{league.name}</p>
            <p className="text-white/80 text-sm font-semibold">{t('leagues.clubCount', { count: league.clubs.length })}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-7">
        <Legend league={league} t={t} />
        <ColumnHeader t={t} />
        <div className="flex flex-col pb-3">
          {rows.map(({ rank, club, zoneColor }) => club && (
            <Row key={rank} rank={rank} club={club} accent={accent} zoneColor={zoneColor} />
          ))}
        </div>
      </div>

      <div className="px-7 pb-7 pt-5 flex flex-col items-center gap-2 shrink-0">
        <Logo className="h-9 w-auto" />
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-white/50">MUNDIAL</p>
      </div>
    </div>
  )
}
