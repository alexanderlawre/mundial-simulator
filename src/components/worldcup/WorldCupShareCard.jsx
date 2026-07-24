import { useTranslation } from '../../lib/i18n'

// A minimal, ALWAYS-LIGHT inline flag renderer -- deliberately not reusing
// CountryFlag.jsx here, since that component carries `dark:` frame classes
// that would leak the user's current app theme into this share "poster"
// via the ancestor .dark class on <html> (Tailwind dark-mode selectors
// aren't scoped to a component subtree, only to real DOM ancestry). Mirrors
// LeagueShareCard.jsx's LightFlag exactly.
function LightFlag({ team, size = 40 }) {
  if (!team) return null
  const Custom = team.customFlag
  const iso = (team.iso2 || '').toLowerCase()
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

function PodiumRow({ rank, label, team, name, tone }) {
  const toneClasses = {
    silver: 'bg-gradient-to-r from-charcoal-100 to-white border-charcoal-600/40',
    bronze: 'bg-gradient-to-r from-[#e8c9a8] to-white border-[#b97a4a]/50',
    default: 'bg-white border-charcoal-900/10',
  }[tone]
  if (!name) return null
  return (
    <div className={`h-full flex items-center gap-3 px-4 rounded-xl border ${toneClasses}`}>
      <span className="w-7 text-center font-display font-extrabold text-sm text-charcoal-900 tabular-nums shrink-0">{rank}</span>
      <LightFlag team={team} size={32} />
      <span className="flex-1 min-w-0 truncate font-display font-semibold text-charcoal-900 text-sm">{name}</span>
      <span className="text-[10px] uppercase tracking-wide font-bold text-charcoal-600/60 shrink-0">{label}</span>
    </div>
  )
}

// Portrait, "paper size" World Cup win share card (A4-like 1:1.414
// aspect), mirroring LeagueShareCard.jsx's structure exactly: rendered
// off-screen at a fixed width by WorldCupShareModal.jsx and captured to
// PNG via shareImage.js. Champion gets a large hero treatment up top;
// runner-up/3rd/4th flow as a compact podium list below. Never uses any
// `dark:`-prefixed class anywhere in this file, so the exported image is
// always a consistent, legible light "poster" no matter the app's current
// theme.
export default function WorldCupShareCard({ title, hostLabel, champion, runnerUp, thirdPlace, fourthPlace, teamsByName }) {
  const { t, tn } = useTranslation()
  const championTeam = teamsByName[champion]

  return (
    <div className="w-[720px] aspect-[1/1.414] bg-[#F4EFE6] rounded-3xl overflow-hidden shadow-depth-lg font-sans flex flex-col">
      <div className="p-7 text-charcoal-900 shrink-0 bg-gradient-to-br from-gold-light via-gold to-gold-light text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-charcoal-900/70 mb-1">{title}</p>
        {hostLabel && <p className="text-[11px] text-charcoal-900/60">{hostLabel}</p>}
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-7 py-6">
        <div className="flex flex-col items-center gap-3 shrink-0 mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-gold">{t('play.champions')}</p>
          <LightFlag team={championTeam} size={96} />
          <p className="font-display font-extrabold text-3xl text-charcoal-900 text-center leading-tight">{tn(champion)}</p>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="flex-1 min-h-0">
            <PodiumRow rank={2} label={t('summary.runnerUp')} team={teamsByName[runnerUp]} name={runnerUp ? tn(runnerUp) : ''} tone="silver" />
          </div>
          <div className="flex-1 min-h-0">
            <PodiumRow rank={3} label={t('summary.thirdPlace')} team={teamsByName[thirdPlace]} name={thirdPlace ? tn(thirdPlace) : ''} tone="bronze" />
          </div>
          <div className="flex-1 min-h-0">
            <PodiumRow rank={4} label={t('summary.fourthPlace')} team={teamsByName[fourthPlace]} name={fourthPlace ? tn(fourthPlace) : ''} tone="default" />
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 flex items-center justify-center shrink-0">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-charcoal-600/50">MUNDIAL</p>
      </div>
    </div>
  )
}
