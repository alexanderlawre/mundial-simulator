// v1 "Projected standings" -- deterministic points-per-game extrapolation
// over each club's remaining fixtures. Per the spec: no reading analyst
// opinions, must be transparent/reproducible. Pure function operating on
// whatever fixturesSource.getCurrentStandings() returns (stub returns
// null today; a real implementation returns StandingsRow[] once wired
// up) -- swapping the data source later requires zero changes here.
//
// v2 (Monte Carlo simulation using Elo/SPI-style ratings for average
// finishing position + qualification probabilities) is an explicit
// follow-up, not built this round.

// standings: StandingsRow[] ({ clubKey, played, points, goalDiff }) | null
// totalMatchesPerClub: season length (20-club leagues play 38 matches;
// Ligue 1/Bundesliga's 18-club format plays 34 -- pass explicitly per
// league rather than assuming 38 everywhere).
// Returns [] if there's no standings data yet (honest empty state, not a
// fabricated projection).
export function projectStandingsPPG(standings, totalMatchesPerClub = 38) {
  if (!standings || standings.length === 0) return []
  const projected = standings.map((club) => {
    const played = club.played || 0
    const points = club.points || 0
    const remaining = Math.max(0, totalMatchesPerClub - played)
    const pointsPerGame = played > 0 ? points / played : 0
    const projectedPoints = points + pointsPerGame * remaining
    return {
      ...club,
      pointsPerGame: Math.round(pointsPerGame * 100) / 100,
      projectedPoints: Math.round(projectedPoints * 10) / 10,
    }
  })
  return projected.sort((a, b) => {
    if (b.projectedPoints !== a.projectedPoints) return b.projectedPoints - a.projectedPoints
    return (b.goalDiff || 0) - (a.goalDiff || 0)
  })
}
