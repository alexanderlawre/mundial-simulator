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

export const LEAGUES = [
  {
    key: 'premier-league',
    name: 'Premier League',
    country: 'England',
    colors: { from: '#3D195B', to: '#E90052', accent: '#E90052' },
    clubs: [
      { key: 'arsenal', name: 'Arsenal', badgeUrl: logo('logos/England - Premier League/Arsenal FC.png') },
      { key: 'aston-villa', name: 'Aston Villa', badgeUrl: logo('logos/England - Premier League/Aston Villa.png') },
      { key: 'bournemouth', name: 'AFC Bournemouth', badgeUrl: logo('logos/England - Premier League/AFC Bournemouth.png') },
      { key: 'brentford', name: 'Brentford', badgeUrl: logo('logos/England - Premier League/Brentford FC.png') },
      { key: 'brighton', name: 'Brighton & Hove Albion', badgeUrl: logo('logos/England - Premier League/Brighton & Hove Albion.png') },
      { key: 'chelsea', name: 'Chelsea', badgeUrl: logo('logos/England - Premier League/Chelsea FC.png') },
      { key: 'coventry-city', name: 'Coventry City', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7b/Coventry_City_FC_crest.svg' },
      { key: 'crystal-palace', name: 'Crystal Palace', badgeUrl: logo('logos/England - Premier League/Crystal Palace.png') },
      { key: 'everton', name: 'Everton', badgeUrl: logo('logos/England - Premier League/Everton FC.png') },
      { key: 'fulham', name: 'Fulham', badgeUrl: logo('logos/England - Premier League/Fulham FC.png') },
      { key: 'hull-city', name: 'Hull City', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/5/54/Hull_City_A.F.C._logo.svg' },
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
    clubs: [
      { key: 'alaves', name: 'Alavés', badgeUrl: logo('logos/Spain - LaLiga/Deportivo Alavés.png') },
      { key: 'athletic-bilbao', name: 'Athletic Bilbao', badgeUrl: logo('logos/Spain - LaLiga/Athletic Bilbao.png') },
      { key: 'atletico-madrid', name: 'Atlético Madrid', badgeUrl: logo('logos/Spain - LaLiga/Atlético de Madrid.png') },
      { key: 'barcelona', name: 'Barcelona', badgeUrl: logo('logos/Spain - LaLiga/FC Barcelona.png') },
      { key: 'celta-vigo', name: 'Celta Vigo', badgeUrl: logo('logos/Spain - LaLiga/Celta de Vigo.png') },
      { key: 'deportivo-la-coruna', name: 'Deportivo La Coruña', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/RC_Deportivo_A_Coru%C3%B1a_logo_2026.svg' },
      { key: 'elche', name: 'Elche', badgeUrl: logo('logos/Spain - LaLiga/Elche CF.png') },
      { key: 'espanyol', name: 'Espanyol', badgeUrl: logo('logos/Spain - LaLiga/RCD Espanyol Barcelona.png') },
      { key: 'getafe', name: 'Getafe', badgeUrl: logo('logos/Spain - LaLiga/Getafe CF.png') },
      { key: 'levante', name: 'Levante', badgeUrl: logo('logos/Spain - LaLiga/Levante UD.png') },
      { key: 'malaga', name: 'Málaga', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/6/6d/M%C3%A1laga_CF.svg' },
      { key: 'osasuna', name: 'Osasuna', badgeUrl: logo('logos/Spain - LaLiga/CA Osasuna.png') },
      { key: 'racing-santander', name: 'Racing Santander', badgeUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f5/Racing_de_Santander_logo.svg' },
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
    clubs: [
      { key: 'atalanta', name: 'Atalanta', badgeUrl: logo('logos/Italy - Serie A/Atalanta BC.png') },
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
