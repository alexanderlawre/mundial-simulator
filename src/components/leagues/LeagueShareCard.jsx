import ClubBadge from './ClubBadge'
import { getZoneForRank } from '../../data/leagues'
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

// One numbered row, light-only, badge + name. `h-full` lets it stretch to
// fill an equal-share flex slot in the portrait card body below, so every
// row grows/shrinks together to exactly fill the fixed page height
// regardless of how many clubs the league has.
// Podium background treatment for top 3 stays as poster flair (adds
// emphasis, loses no information), but the left border always reflects the
// club's *real* qualification zone color (Champions League / Europa /
// Conference / relegation playoff / relegation) exactly as shown in the
// on-device predicted table -- previously this collapsed everything outside
// the top 3 and the relegation zone down to a plain white row, silently
// dropping the Europa/Conference/playoff zone info the live table shows.
function Row({ rank, club, accent, podium, zoneColor }) {
  const podiumClasses = {
    gold: 'bg-gradient-to-r from-gold-light via-gold to-gold-light shadow-depth-gold',
    silver: 'bg-gradient-to-r from-charcoal-100 to-white',
    bronze: 'bg-gradient-to-r from-[#e8c9a8] to-white',
  }[podium] || 'bg-white'

  return (
    <div
      className={`h-full flex items-center gap-3 px-3 rounded-xl border border-charcoal-900/10 border-l-4 ${podiumClasses}`}
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

// Portrait, "paper size" share card (A4-like 1:1.414 aspect, fixed
// dimensions) rendered off-screen by LeagueShareModal.jsx and captured to
// PNG via shareImage.js. The full table always flows as a single tall
// column -- top3 get gold/silver/bronze podium treatment on top of a real
// per-position zone-color left border (Champions League/Europa/Conference/
// relegation playoff/relegation, same colors + ranges as the on-device
// table via getZoneForRank) -- and every row takes an equal flex share of
// the body height so an 18-club league and a 20-club league both fill the
// same page shape edge-to-edge. Never uses any `dark:`-prefixed class
// anywhere in this file, so the exported image is always a consistent,
// legible light "poster" no matter the app's current theme.
export default function LeagueShareCard({ league, nation, clubs, order }) {
  const { t } = useTranslation()
  const accent = league.colors.accent
  const rows = order.map((k, i) => {
    const rank = i + 1
    const podium = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null
    return { rank, club: clubs[k], podium, zoneColor: getZoneForRank(league, rank)?.color }
  })

  return (
    <div className="w-[720px] aspect-[1/1.414] bg-[#F4EFE6] rounded-3xl overflow-hidden shadow-depth-lg font-sans flex flex-col">
      <div
        className="p-7 text-white shrink-0"
        style={{ background: `linear-gradient(135deg, ${league.colors.from}, ${league.colors.to})` }}
      >
        <div className="flex items-center gap-3">
          <LightFlag nation={nation} size={52} />
          <div>
            <p className="font-display text-3xl font-extrabold leading-tight">{league.name}</p>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">{t('leagues.shareFullTitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-1.5">
        {rows.map(({ rank, club, podium, zoneColor }) => club && (
          <div key={rank} className="flex-1 min-h-0">
            <Row rank={rank} club={club} accent={accent} podium={podium} zoneColor={zoneColor} />
          </div>
        ))}
      </div>

      <div className="px-6 pb-6 flex items-center justify-center shrink-0">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal-600/50">MUNDIAL</p>
      </div>
    </div>
  )
}
