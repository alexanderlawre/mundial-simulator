// Swappable fixtures/results data source for "Predict the League" live
// features (matchday predictions + projected standings). Ships with a
// stub implementation that returns clearly-labeled empty/null data so
// anything built against this interface is honest about not having live
// data yet, rather than faking numbers. Swap the `fixturesSource` export
// below to `footballDataOrgSource` once FOOTBALL_DATA_API_KEY is
// configured (see .env.example) -- no other code in this app needs to
// change, since MatchdayPredict.jsx / projectedStandings.js only ever
// import `fixturesSource`, never a concrete implementation.
//
// Fixture shape: { id, leagueKey, matchday, homeClubKey, awayClubKey,
//   kickoffTs (ISO string), homeScore, awayScore, status }
// Standings-row shape: { clubKey, played, points, goalDiff }

const stubFixturesSource = {
  // async (leagueKey, matchday) => Fixture[]
  async getFixturesForMatchday(_leagueKey, _matchday) {
    return []
  },
  // async (leagueKey) => StandingsRow[] | null
  async getCurrentStandings(_leagueKey) {
    return null
  },
  // async (leagueKey, clubKey) => Fixture[]
  async getRemainingFixtures(_leagueKey, _clubKey) {
    return []
  },
}

// Active data source. This is the only export other modules should use.
export const fixturesSource = stubFixturesSource

/* ---------------------------------------------------------------------
 * football-data.org implementation (INACTIVE -- not wired up).
 *
 * Free tier: https://www.football-data.org/documentation/quickstart --
 * bearer-token auth via an `X-Auth-Token` header, no cost for the
 * competitions this app covers. Requires a `VITE_FOOTBALL_DATA_API_KEY`
 * env var (see .env.example) and a data/leagues.js club-key ->
 * football-data.org team-ID mapping that hasn't been built yet.
 *
 * Left commented out rather than half-wired so it's obvious this isn't
 * live: uncomment, fill in the team-ID mapping, and change the
 * `fixturesSource` export above to `footballDataOrgSource` once a key is
 * available.
 *
 * const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'
 *
 * async function fdFetch(path) {
 *   const res = await fetch(`${FOOTBALL_DATA_BASE}${path}`, {
 *     headers: { 'X-Auth-Token': import.meta.env.VITE_FOOTBALL_DATA_API_KEY },
 *   })
 *   if (!res.ok) throw new Error(`football-data.org request failed: ${res.status}`)
 *   return res.json()
 * }
 *
 * export const footballDataOrgSource = {
 *   async getFixturesForMatchday(leagueKey, matchday) {
 *     // GET /competitions/{code}/matches?matchday={matchday}, map team IDs
 *     // back to data/leagues.js club keys via the (not-yet-built) mapping.
 *   },
 *   async getCurrentStandings(leagueKey) {
 *     // GET /competitions/{code}/standings
 *   },
 *   async getRemainingFixtures(leagueKey, clubKey) {
 *     // GET /teams/{id}/matches?status=SCHEDULED
 *   },
 * }
 * ------------------------------------------------------------------- */
