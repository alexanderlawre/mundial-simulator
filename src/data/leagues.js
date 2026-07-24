// "Predict the League" club/league data. Mirrors data/nations.js's
// array + lookup-map + getter-function convention, but splits a stable
// `key` (routing/storage identifier, never changes) from `name` (canonical
// English display string). Club-name translation is explicitly out of
// scope -- names render as-is everywhere, no `tn()`.
//
// Badge images are hotlinked (never downloaded into the repo). Most clubs
// use the `luukhopman/football-logos` GitHub repo, which serves PNGs with
// an open `access-control-allow-origin: *` header (verified via curl),
// making them safe for html2canvas capture later. 5 clubs (promoted from a
// division outside that repo's coverage, or otherwise absent from its
// current + history folders) instead hotlink their crest directly from
// Wikipedia (`upload.wikimedia.org`, also verified via curl to serve open
// CORS headers even for these non-free/fair-use files). `ClubBadge` still
// renders a monogram (initials) fallback for any club whose badge is
// missing or fails to load, as a safety net.

const LOGO_BASE = 'https://raw.githubusercontent.com/luukhopman/football-logos/master'

function logo(path) {
  return `${LOGO_BASE}/${encodeURI(path)}`
}

// Shared UEFA-style zone colors, reused across leagues so the legend/UI has
// one consistent palette. `relegationPlayoff` (Ligue 1 / Bundesliga's 16th
// place) gets its own color since it's neither safe nor a direct relegation.
const ZONE_COLORS = {
  ucl: '#10b981', // emerald
  uclQualifying: '#6ee7b7', // light emerald
  uel: '#3b82f6', // blue
  uecl: '#a855f7', // purple
  relegationPlayoff: '#f97316', // orange
  relegation: '#ef4444', // red
  libertadores: '#10b981', // emerald
  sudamericana: '#3b82f6', // blue
}

// `zones` is a declarative list of 1-indexed inclusive rank ranges per
// league, each tagged with a stable `key` (maps to an i18n label + the
// shared color above). Replaces the old hardcoded `i < 4` / `i >= length -
// 3` boolean checks that were duplicated across LeaguePredict/DragBoard/
// ShareCard and couldn't express anything beyond "top 4 / bottom 3".
function zone(key, from, to) {
  return { key, from, to, color: ZONE_COLORS[key] }
}

export function getZoneForRank(league, rank) {
  return league?.zones?.find((z) => rank >= z.from && rank <= z.to) || null
}

// Placeholder cards shown on the Leagues Hub for competitions that aren't
// predictable yet -- no `clubs`/`zones`, just enough to render a disabled
// "Coming Soon" card with the same gradient-card visual language.
export const UPCOMING_COMPETITIONS = [
  { key: 'champions-league', name: 'Champions League', colors: { from: '#0A1428', to: '#1E3A8A' } },
  { key: 'europa-league', name: 'Europa League', colors: { from: '#FF6B00', to: '#7A2E00' } },
  { key: 'conference-league', name: 'Conference League', colors: { from: '#00A651', to: '#0A3D24' } },
]

export const LEAGUES = [
  {
    key: 'premier-league',
    name: 'Premier League',
    country: 'England',
    colors: { from: '#3D195B', to: '#E90052', accent: '#E90052' },
    zones: [zone('ucl', 1, 4), zone('uel', 5, 5), zone('uecl', 6, 6), zone('relegation', 18, 20)],
    clubs: [
      { key: 'arsenal', name: 'Arsenal', badgeUrl: logo('logos/England - Premier League/Arsenal FC.png') },
      { key: 'aston-villa', name: 'Aston Villa', badgeUrl: logo('logos/England - Premier League/Aston Villa.png') },
      { key: 'bournemouth', name: 'AFC Bournemouth', badgeUrl: logo('logos/England - Premier League/AFC Bournemouth.png') },
      { key: 'brentford', name: 'Brentford', badgeUrl: logo('logos/England - Premier League/Brentford FC.png') },
      { key: 'brighton', name: 'Brighton & Hove Albion', badgeUrl: logo('logos/England - Premier League/Brighton & Hove Albion.png') },
      { key: 'chelsea', name: 'Chelsea', badgeUrl: logo('logos/England - Premier League/Chelsea FC.png') },
      { key: 'coventry-city', name: 'Coventry City', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7b/Coventry_City_FC_crest.svg', badgeScale: 0.85 },
      { key: 'crystal-palace', name: 'Crystal Palace', badgeUrl: logo('logos/England - Premier League/Crystal Palace.png') },
      { key: 'everton', name: 'Everton', badgeUrl: logo('logos/England - Premier League/Everton FC.png') },
      { key: 'fulham', name: 'Fulham', badgeUrl: logo('logos/England - Premier League/Fulham FC.png') },
      { key: 'hull-city', name: 'Hull City', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/5/54/Hull_City_A.F.C._logo.svg', badgeScale: 0.85 },
      { key: 'ipswich-town', name: 'Ipswich Town', badgeUrl: logo('history/2024-25/England - Premier League/Ipswich Town.png') },
      { key: 'leeds-united', name: 'Leeds United', badgeUrl: logo('logos/England - Premier League/Leeds United.png') },
      { key: 'liverpool', name: 'Liverpool', badgeUrl: logo('logos/England - Premier League/Liverpool FC.png') },
      { key: 'manchester-city', name: 'Manchester City', badgeUrl: logo('logos/England - Premier League/Manchester City.png') },
      { key: 'manchester-united', name: 'Manchester United', badgeUrl: logo('logos/England - Premier League/Manchester United.png') },
      { key: 'newcastle-united', name: 'Newcastle United', badgeUrl: logo('logos/England - Premier League/Newcastle United.png') },
      { key: 'nottingham-forest', name: 'Nottingham Forest', badgeUrl: logo('logos/England - Premier League/Nottingham Forest.png') },
      { key: 'sunderland', name: 'Sunderland', badgeUrl: logo('logos/England - Premier League/Sunderland AFC.png') },
      { key: 'tottenham', name: 'Tottenham Hotspur', badgeUrl: logo('logos/England - Premier League/Tottenham Hotspur.png') },
    ],
  },
  {
    key: 'la-liga',
    name: 'La Liga',
    country: 'Spain',
    colors: { from: '#EE2523', to: '#EE8707', accent: '#EE2523' },
    zones: [zone('ucl', 1, 4), zone('uel', 5, 5), zone('uecl', 6, 6), zone('relegation', 18, 20)],
    clubs: [
      { key: 'alaves', name: 'Alavés', badgeUrl: logo('logos/Spain - LaLiga/Deportivo Alavés.png') },
      { key: 'athletic-bilbao', name: 'Athletic Bilbao', badgeUrl: logo('logos/Spain - LaLiga/Athletic Bilbao.png') },
      { key: 'atletico-madrid', name: 'Atlético Madrid', badgeUrl: logo('logos/Spain - LaLiga/Atlético de Madrid.png') },
      { key: 'barcelona', name: 'Barcelona', badgeUrl: logo('logos/Spain - LaLiga/FC Barcelona.png') },
      { key: 'celta-vigo', name: 'Celta Vigo', badgeUrl: logo('logos/Spain - LaLiga/Celta de Vigo.png') },
      { key: 'deportivo-la-coruna', name: 'Deportivo La Coruña', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/RC_Deportivo_A_Coru%C3%B1a_logo_2026.svg', badgeScale: 0.85 },
      { key: 'elche', name: 'Elche', badgeUrl: logo('logos/Spain - LaLiga/Elche CF.png') },
      { key: 'espanyol', name: 'Espanyol', badgeUrl: logo('logos/Spain - LaLiga/RCD Espanyol Barcelona.png') },
      { key: 'getafe', name: 'Getafe', badgeUrl: logo('logos/Spain - LaLiga/Getafe CF.png') },
      { key: 'levante', name: 'Levante', badgeUrl: logo('logos/Spain - LaLiga/Levante UD.png') },
      { key: 'malaga', name: 'Málaga', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/6/6d/M%C3%A1laga_CF.svg', badgeScale: 0.85 },
      { key: 'osasuna', name: 'Osasuna', badgeUrl: logo('logos/Spain - LaLiga/CA Osasuna.png') },
      { key: 'racing-santander', name: 'Racing Santander', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f5/Racing_de_Santander_logo.svg', badgeScale: 0.85 },
      { key: 'rayo-vallecano', name: 'Rayo Vallecano', badgeUrl: logo('logos/Spain - LaLiga/Rayo Vallecano.png') },
      { key: 'real-betis', name: 'Real Betis', badgeUrl: logo('logos/Spain - LaLiga/Real Betis Balompié.png') },
      { key: 'real-madrid', name: 'Real Madrid', badgeUrl: logo('logos/Spain - LaLiga/Real Madrid.png') },
      { key: 'real-sociedad', name: 'Real Sociedad', badgeUrl: logo('logos/Spain - LaLiga/Real Sociedad.png') },
      { key: 'sevilla', name: 'Sevilla', badgeUrl: logo('logos/Spain - LaLiga/Sevilla FC.png') },
      { key: 'valencia', name: 'Valencia', badgeUrl: logo('logos/Spain - LaLiga/Valencia CF.png') },
      { key: 'villarreal', name: 'Villarreal', badgeUrl: logo('logos/Spain - LaLiga/Villarreal CF.png') },
    ],
  },
  {
    key: 'serie-a',
    name: 'Serie A',
    country: 'Italy',
    colors: { from: '#008C45', to: '#008FD7', accent: '#008C45' },
    zones: [zone('ucl', 1, 4), zone('uel', 5, 5), zone('uecl', 6, 6), zone('relegation', 18, 20)],
    clubs: [
      { key: 'atalanta', name: 'Atalanta', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Atalanta_BC_new_logo.svg', badgeScale: 0.85 },
      { key: 'bologna', name: 'Bologna', badgeUrl: logo('logos/Italy - Serie A/Bologna FC 1909.png') },
      { key: 'cagliari', name: 'Cagliari', badgeUrl: logo('logos/Italy - Serie A/Cagliari Calcio.png') },
      { key: 'como', name: 'Como', badgeUrl: logo('logos/Italy - Serie A/Como 1907.png') },
      { key: 'fiorentina', name: 'Fiorentina', badgeUrl: logo('logos/Italy - Serie A/ACF Fiorentina.png') },
      { key: 'frosinone', name: 'Frosinone', badgeUrl: logo('history/2023-24/Italy - Serie A/Frosinone Calcio.png') },
      { key: 'genoa', name: 'Genoa', badgeUrl: logo('logos/Italy - Serie A/Genoa CFC.png') },
      { key: 'inter-milan', name: 'Inter Milan', badgeUrl: logo('logos/Italy - Serie A/Inter Milan.png') },
      { key: 'juventus', name: 'Juventus', badgeUrl: logo('logos/Italy - Serie A/Juventus FC.png') },
      { key: 'lazio', name: 'Lazio', badgeUrl: logo('logos/Italy - Serie A/SS Lazio.png') },
      { key: 'lecce', name: 'Lecce', badgeUrl: logo('logos/Italy - Serie A/US Lecce.png') },
      { key: 'milan', name: 'Milan', badgeUrl: logo('logos/Italy - Serie A/AC Milan.png') },
      { key: 'monza', name: 'Monza', badgeUrl: logo('history/2024-25/Italy - Serie A/AC Monza.png') },
      { key: 'napoli', name: 'Napoli', badgeUrl: logo('logos/Italy - Serie A/SSC Napoli.png') },
      { key: 'parma', name: 'Parma', badgeUrl: logo('logos/Italy - Serie A/Parma Calcio 1913.png') },
      { key: 'roma', name: 'Roma', badgeUrl: logo('logos/Italy - Serie A/AS Roma.png') },
      { key: 'sassuolo', name: 'Sassuolo', badgeUrl: logo('logos/Italy - Serie A/US Sassuolo.png') },
      { key: 'torino', name: 'Torino', badgeUrl: logo('logos/Italy - Serie A/Torino FC.png') },
      { key: 'udinese', name: 'Udinese', badgeUrl: logo('logos/Italy - Serie A/Udinese Calcio.png') },
      { key: 'venezia', name: 'Venezia', badgeUrl: logo('history/2024-25/Italy - Serie A/Venezia FC.png') },
    ],
  },
  {
    key: 'ligue-1',
    name: 'Ligue 1',
    country: 'France',
    colors: { from: '#0055A4', to: '#001B4C', accent: '#0055A4' },
    // 18 clubs: top 3 go straight to the UCL group stage, 4th enters UCL
    // qualifying, 5th/6th get UEL/UECL. 16th plays a relegation playoff
    // against a second-division side, bottom 2 go straight down.
    zones: [
      zone('ucl', 1, 3),
      zone('uclQualifying', 4, 4),
      zone('uel', 5, 5),
      zone('uecl', 6, 6),
      zone('relegationPlayoff', 16, 16),
      zone('relegation', 17, 18),
    ],
    clubs: [
      { key: 'psg', name: 'Paris Saint-Germain', badgeUrl: logo('logos/France - Ligue 1/Paris Saint-Germain.png') },
      { key: 'marseille', name: 'Olympique Marseille', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Olympique_de_Marseille_2026_logo.svg', badgeScale: 0.85 },
      { key: 'monaco', name: 'AS Monaco', badgeUrl: logo('logos/France - Ligue 1/AS Monaco.png') },
      { key: 'lille', name: 'LOSC Lille', badgeUrl: logo('logos/France - Ligue 1/LOSC Lille.png') },
      { key: 'lyon', name: 'Olympique Lyon', badgeUrl: logo('logos/France - Ligue 1/Olympique Lyon.png') },
      { key: 'nice', name: 'OGC Nice', badgeUrl: logo('logos/France - Ligue 1/OGC Nice.png') },
      { key: 'lens', name: 'RC Lens', badgeUrl: logo('logos/France - Ligue 1/RC Lens.png') },
      { key: 'rennes', name: 'Stade Rennais FC', badgeUrl: logo('logos/France - Ligue 1/Stade Rennais FC.png') },
      { key: 'strasbourg', name: 'RC Strasbourg Alsace', badgeUrl: logo('logos/France - Ligue 1/RC Strasbourg Alsace.png') },
      { key: 'toulouse', name: 'FC Toulouse', badgeUrl: logo('logos/France - Ligue 1/FC Toulouse.png') },
      { key: 'brest', name: 'Stade Brestois 29', badgeUrl: logo('logos/France - Ligue 1/Stade Brestois 29.png') },
      { key: 'le-havre', name: 'Le Havre AC', badgeUrl: logo('logos/France - Ligue 1/Le Havre AC.png') },
      { key: 'auxerre', name: 'AJ Auxerre', badgeUrl: logo('logos/France - Ligue 1/AJ Auxerre.png') },
      { key: 'angers', name: 'Angers SCO', badgeUrl: logo('logos/France - Ligue 1/Angers SCO.png') },
      { key: 'lorient', name: 'FC Lorient', badgeUrl: logo('logos/France - Ligue 1/FC Lorient.png') },
      { key: 'paris-fc', name: 'Paris FC', badgeUrl: logo('logos/France - Ligue 1/Paris FC.png') },
      // Promoted for 2026-27 (replacing relegated Metz & Nantes); not yet in
      // the football-logos repo's current-season snapshot, so these two
      // hotlink Wikipedia crests instead, same fallback pattern as above.
      { key: 'troyes', name: 'ES Troyes AC', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/ESTAC_Troyes_Logo.svg', badgeScale: 0.85 },
      { key: 'le-mans', name: 'Le Mans FC', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/5/57/Le_Mans_FC_logo.svg', badgeScale: 0.85 },
    ],
  },
  {
    key: 'bundesliga',
    name: 'Bundesliga',
    country: 'Germany',
    colors: { from: '#D20515', to: '#FFCC00', accent: '#D20515' },
    // 18 clubs: top 4 go to UCL, 5th/6th to UEL/UECL (Germany's UEL berth
    // is currently a straight allocation, no playoff round). 16th plays a
    // two-legged relegation playoff against the 2. Bundesliga's 3rd place,
    // bottom 2 go straight down.
    zones: [
      zone('ucl', 1, 4),
      zone('uel', 5, 5),
      zone('uecl', 6, 6),
      zone('relegationPlayoff', 16, 16),
      zone('relegation', 17, 18),
    ],
    clubs: [
      { key: 'bayern-munich', name: 'Bayern Munich', badgeUrl: logo('logos/Germany - Bundesliga/Bayern Munich.png') },
      { key: 'bayer-leverkusen', name: 'Bayer Leverkusen', badgeUrl: logo('logos/Germany - Bundesliga/Bayer 04 Leverkusen.png') },
      { key: 'rb-leipzig', name: 'RB Leipzig', badgeUrl: logo('logos/Germany - Bundesliga/RB Leipzig.png') },
      { key: 'borussia-dortmund', name: 'Borussia Dortmund', badgeUrl: logo('logos/Germany - Bundesliga/Borussia Dortmund.png') },
      { key: 'eintracht-frankfurt', name: 'Eintracht Frankfurt', badgeUrl: logo('logos/Germany - Bundesliga/Eintracht Frankfurt.png') },
      { key: 'vfb-stuttgart', name: 'VfB Stuttgart', badgeUrl: logo('logos/Germany - Bundesliga/VfB Stuttgart.png') },
      { key: 'borussia-monchengladbach', name: 'Borussia Mönchengladbach', badgeUrl: logo('logos/Germany - Bundesliga/Borussia Mönchengladbach.png') },
      { key: 'sc-freiburg', name: 'SC Freiburg', badgeUrl: logo('logos/Germany - Bundesliga/SC Freiburg.png') },
      { key: 'union-berlin', name: 'Union Berlin', badgeUrl: logo('logos/Germany - Bundesliga/1.FC Union Berlin.png') },
      { key: 'werder-bremen', name: 'Werder Bremen', badgeUrl: logo('logos/Germany - Bundesliga/SV Werder Bremen.png') },
      { key: 'mainz-05', name: 'Mainz 05', badgeUrl: logo('logos/Germany - Bundesliga/1.FSV Mainz 05.png') },
      { key: 'fc-augsburg', name: 'FC Augsburg', badgeUrl: logo('logos/Germany - Bundesliga/FC Augsburg.png') },
      { key: 'tsg-hoffenheim', name: 'TSG Hoffenheim', badgeUrl: logo('logos/Germany - Bundesliga/TSG 1899 Hoffenheim.png') },
      { key: 'hamburger-sv', name: 'Hamburger SV', badgeUrl: logo('logos/Germany - Bundesliga/Hamburger SV.png') },
      { key: 'fc-koln', name: '1. FC Köln', badgeUrl: logo('logos/Germany - Bundesliga/1.FC Köln.png') },
      // Promoted for 2026-27 (replacing relegated Wolfsburg, Heidenheim &
      // St. Pauli); not yet in the football-logos repo's current-season
      // snapshot, so these hotlink Wikipedia crests instead.
      { key: 'schalke-04', name: 'Schalke 04', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/FC_Schalke_04_Logo.svg', badgeScale: 0.85 },
      { key: 'sv-elversberg', name: 'SV Elversberg', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/SV_Elversberg_Logo_2021.svg', badgeScale: 0.85 },
      { key: 'sc-paderborn', name: 'SC Paderborn 07', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/SC_Paderborn_07_Logo_new.svg', badgeScale: 0.85 },
    ],
  },
  {
    key: 'brasileirao',
    name: 'Brasileirão Série A',
    country: 'Brazil',
    colors: { from: '#009C3B', to: '#FFDF00', accent: '#009C3B' },
    // 20 clubs, no UEFA-style zones -- top 6 qualify for the Copa
    // Libertadores group stage, 7th-12th go to the Copa Sudamericana, and
    // (unlike the European leagues here) 4 teams go down instead of 3.
    zones: [zone('libertadores', 1, 6), zone('sudamericana', 7, 12), zone('relegation', 17, 20)],
    clubs: [
      { key: 'flamengo', name: 'Flamengo', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Clube_de_Regatas_do_Flamengo_logo.svg' },
      { key: 'palmeiras', name: 'Palmeiras', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/60/SE_Palmeiras_2025_crest.png' },
      { key: 'sao-paulo', name: 'São Paulo', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/S%C3%A3o_Paulo_Futebol_Clube_logo_%282022%29.svg' },
      { key: 'corinthians', name: 'Corinthians', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5a/Sport_Club_Corinthians_Paulista_crest.svg' },
      { key: 'santos', name: 'Santos', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Santos_Futebol_Clube_logo_%28with_stars_and_crown%29.png' },
      { key: 'fluminense', name: 'Fluminense', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Fluminense_Football_Club.svg' },
      { key: 'botafogo', name: 'Botafogo', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg' },
      { key: 'vasco-da-gama', name: 'Vasco da Gama', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a5/Club_de_Regatas_Vasco_da_Gama_logo_%282021%29.svg' },
      { key: 'gremio', name: 'Grêmio', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Gremio_logo.svg' },
      { key: 'internacional', name: 'Internacional', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Sport_Club_Internacional_logo.svg' },
      { key: 'atletico-mineiro', name: 'Atlético Mineiro', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Logo_of_Clube_Atl%C3%A9tico_Mineiro.svg' },
      { key: 'cruzeiro', name: 'Cruzeiro', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg' },
      { key: 'bahia', name: 'Bahia', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Logo_of_Esporte_Clube_Bahia_%282004%29.svg' },
      { key: 'bragantino', name: 'Bragantino', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Red_Bull_Bragantino_logo.svg' },
      { key: 'vitoria', name: 'Vitória', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Esporte_Clube_Vit%C3%B3ria_%282024%29.svg' },
      { key: 'mirassol', name: 'Mirassol', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Mirassol_FC_logo.png' },
      // Promoted for the 2026 season (replacing relegated Fortaleza, Ceará,
      // Juventude & Sport Recife).
      { key: 'coritiba', name: 'Coritiba', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Coritiba_Foot_Ball_Club_logo.svg' },
      { key: 'athletico-paranaense', name: 'Athletico Paranaense', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Athletico_Paranaense_%28Logo_2019%29.svg' },
      { key: 'chapecoense', name: 'Chapecoense', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Logo_Associa%C3%A7%C3%A3o_Chapecoense_de_Futebol.svg' },
      { key: 'remo', name: 'Remo', badgeUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Clube_do_Remo.svg' },
    ],
  },
]

export const leaguesByKey = Object.fromEntries(LEAGUES.map((l) => [l.key, l]))

export function getLeague(key) {
  return leaguesByKey[key] || null
}

export function clubsByKey(leagueKey) {
  return Object.fromEntries((getLeague(leagueKey)?.clubs || []).map((c) => [c.key, c]))
}

export function alphabeticalClubKeys(leagueKey) {
  return [...(getLeague(leagueKey)?.clubs || [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.key)
}
