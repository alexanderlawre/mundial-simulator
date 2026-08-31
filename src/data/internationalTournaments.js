// Config for every "International Tournament" other than the World Cup
// (which keeps its own dedicated 32/48/64-team flow via confederationQuotas.js
// / SimulatorSetup.jsx's team-count picker, untouched by this file).
//
// Each entry drives the setup screen's confederation quotas, GroupDraw's
// group count (teamCount/4, computed generically -- see GroupDraw.jsx), and
// SimulatorPlay's knockout format (advancePerGroup/bestThirds/has3rdPlace).
// `quotas` uses the exact same confederation -> count shape that
// qualifying.js's simulateFullQualifying()/simulateQualifyingForConfederation()
// already consume generically -- no engine changes needed.
//
// Formats verified via web search against each competition's most recently
// completed real edition (see plan doc for sourcing): Euro 2024, Copa
// América 2024, AFCON 2023 (played Jan-Feb 2024), AFC Asian Cup 2023 (played
// Jan-Feb 2024), CONCACAF Gold Cup 2025.
export const INTERNATIONAL_TOURNAMENTS = [
  {
    key: 'euro',
    order: 2,
    quotas: { UEFA: 24 },
    format: { advancePerGroup: 2, bestThirds: 4, has3rdPlace: false },
    colors: { from: '#0C1E4D', to: '#1E5FD9', accent: '#FFD100' }, // UEFA navy/blue + gold
  },
  {
    key: 'copa-america',
    order: 3,
    quotas: { CONMEBOL: 10, CONCACAF: 5, AFC: 1 },
    format: { advancePerGroup: 2, bestThirds: 0, has3rdPlace: true },
    colors: { from: '#5B9BD5', to: '#F2B705', accent: '#F2B705' }, // sky blue + gold
  },
  {
    key: 'afcon',
    order: 4,
    quotas: { CAF: 24 },
    format: { advancePerGroup: 2, bestThirds: 4, has3rdPlace: true },
    colors: { from: '#E86A17', to: '#1C8C4B', accent: '#E86A17' }, // CAF orange + green
  },
  {
    key: 'asian-cup',
    order: 5,
    quotas: { AFC: 24 },
    format: { advancePerGroup: 2, bestThirds: 4, has3rdPlace: false },
    colors: { from: '#6E0F1E', to: '#C4141C', accent: '#F2C230' }, // maroon/red + gold
  },
  {
    key: 'gold-cup',
    order: 6,
    quotas: { CONCACAF: 15, AFC: 1 },
    format: { advancePerGroup: 2, bestThirds: 0, has3rdPlace: false },
    colors: { from: '#B1181E', to: '#0B2E6F', accent: '#F2B705' }, // red + blue + gold
  },
]

export function getTournamentConfig(key) {
  return INTERNATIONAL_TOURNAMENTS.find((t) => t.key === key) || null
}

// Maps a tournament config key to its i18n key prefix under the
// `tournaments.*` namespace (tournaments.<prefix>Name / <prefix>Desc) --
// shared by InternationalTournamentsHub.jsx (card titles) and
// SimulatorSetup.jsx/SimulatorPlay.jsx (screen titles), so the mapping only
// lives in one place.
const I18N_PREFIX = { 'copa-america': 'copa', 'asian-cup': 'asianCup', 'gold-cup': 'goldCup' }
export function tournamentI18nPrefix(key) {
  return I18N_PREFIX[key] || key
}

export function totalFromQuotas(quotas) {
  return Object.values(quotas).reduce((a, b) => a + b, 0)
}
