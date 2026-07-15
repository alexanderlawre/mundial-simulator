import ClubBadge from './ClubBadge'
import { useTranslation } from '../../lib/i18n'

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

// One numbered row, light-only, badge + name. `big` bumps rank-1 up visually.
function Row({ rank, club, accent, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-white border-charcoal-900/10',
    gold: 'bg-gradient-to-r from-gold-light via-gold to-gold-light border-gold shadow-depth-gold',
    silver: 'bg-gradient-to-r from-charcoal-100 to-white border-charcoal-600/40',
    bronze: 'bg-gradient-to-r from-[#e8c9a8] to-white border-[#b97a4a]/50',
    relegation: 'bg-white border-red-500/60 border-l-4',
  }[tone]

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${toneClasses}`}>
      <span className="w-7 text-center font-display font-extrabold text-sm text-charcoal-900 tabular-nums shrink-0">
        {rank}
      </span>
      <ClubBadge club={club} size="sm" accent={accent} />
      <span className="flex-1 min-w-0 truncate font-display font-semibold text-charcoal-900 text-sm">{club.name}</span>
    </div>
  )
}

// Two share-card variants, rendered off-screen at a fixed width by
// LeagueShareModal.jsx and captured to PNG via shareImage.js. Never uses
// any `dark:`-prefixed class anywhere in this file, so the exported image
// is always a consistent, legible light "poster" no matter the app's
// current theme.
export default function LeagueShareCard({ league, nation, clubs, order, variant }) {
  const { t } = useTranslation()
  const accent = league.colors.accent
  // The bottom "relegation zone" block is sized to whatever this league's
  // actual relegation-flavored zones cover (`relegation` and, for Ligue 1/
  // Bundesliga, `relegationPlayoff` too) instead of a hardcoded "last 3" --
  // that was only ever correct for the original 20-team, top4/bottom3 leagues.
  const relegationZones = (league.zones || []).filter((z) => z.key.startsWith('relegation'))
  const relegationStart = relegationZones.length
    ? Math.min(...relegationZones.map((z) => z.from))
    : league.clubs.length - 2
  const top3 = order.slice(0, 3).map((k) => clubs[k])
  const mid = order.slice(3, relegationStart - 1).map((k, i) => ({ rank: i + 4, club: clubs[k] }))
  const bottomZone = order.slice(relegationStart - 1, league.clubs.length).map((k, i) => ({ rank: relegationStart + i, club: clubs[k] }))
  const full = order.map((k, i) => ({ rank: i + 1, club: clubs[k] }))

  return (
    <div className="w-[600px] bg-[#F4EFE6] rounded-3xl overflow-hidden shadow-depth-lg font-sans">
      <div
        className="p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
      >
        <div className="flex items-center gap-3">
          <LightFlag nation={nation} size={48} />
          <div>
            <p className="font-display text-2xl font-extrabold leading-tight">{league.name}</p>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">
              {variant === 'top8' ? t('leagues.shareTop8Title') : t('leagues.shareFullTitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {variant === 'top8' ? (
          <>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="order-1 -mt-2">
                {top3[1] && <Row rank={2} club={top3[1]} accent={accent} tone="silver" />}
              </div>
              <div className="order-2 -mt-4">
                {top3[0] && <Row rank={1} club={top3[0]} accent={accent} tone="gold" />}
              </div>
              <div className="order-3 -mt-2">
                {top3[2] && <Row rank={3} club={top3[2]} accent={accent} tone="bronze" />}
              </div>
            </div>

            <div className="space-y-1.5">
              {mid.map(({ rank, club }) => club && <Row key={rank} rank={rank} club={club} accent={accent} />)}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="flex-1 h-px bg-red-500/30" />
              <span className="text-[11px] uppercase tracking-widest font-bold text-red-600">
                {t('leagues.relegationZone')}
              </span>
              <span className="flex-1 h-px bg-red-500/30" />
            </div>

            <div className="space-y-1.5">
              {bottomZone.map(({ rank, club }) => club && <Row key={rank} rank={rank} club={club} accent={accent} tone="relegation" />)}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            {full.map(({ rank, club }) => club && (
              <Row key={rank} rank={rank} club={club} accent={accent} tone={rank >= relegationStart ? 'relegation' : 'default'} />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pb-5 flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal-600/50">MUNDIAL</p>
      </div>
    </div>
  )
}
