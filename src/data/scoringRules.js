// Single source of truth for every number used by "Predict the League"
// scoring. Both the pure scoring engine (src/lib/leagueScoring.js) and
// any UI copy (e.g. the Groups "How points work" box) import from here
// so the displayed rules can never drift out of sync with the actual
// math -- never hardcode these numbers a second time anywhere else.

export const SCORING = {
  // Preseason table prediction: each team scores
  // max(0, tableMaxPerTeam - tablePlacesOffMultiplier * placesOff).
  // Exact position = tableMaxPerTeam points. Max total = tableMaxPerTeam * 20.
  tableMaxPerTeam: 20,
  tablePlacesOffMultiplier: 2,

  // Table bonuses.
  winnerBonus: 25,
  relegationTrioBonus: 40,
  relegationTrioPartial: 10, // per correct team, if not all 3 correct
  uclBonus: 30,
  uclPartial: 7, // per correct team, if not all 4 correct

  // Matchday predictions (per fixture).
  matchdayOutcomePts: 1, // correct H/D/A
  matchdayExactBonus: 2, // additional points for exact scoreline (3 total)

  // Once per calendar month, a user may nominate one match for double points.
  jokerMultiplier: 2,
}

export const TABLE_MAX_SCORE = SCORING.tableMaxPerTeam * 20

// Plain-language copy for the Groups "How points work" box. Generated
// from SCORING so the numbers shown to users always match the engine.
export function getScoringRulesCopy() {
  const s = SCORING
  return [
    {
      title: 'Preseason table',
      body: `Each team scores ${s.tableMaxPerTeam} minus ${s.tablePlacesOffMultiplier} points per place you have it off, down to a floor of 0. Nail the exact position for the full ${s.tableMaxPerTeam} points. Max table score: ${TABLE_MAX_SCORE}.`,
    },
    {
      title: 'Table bonuses',
      body: `+${s.winnerBonus} for correctly calling the league winner. +${s.relegationTrioBonus} for getting all 3 relegated teams right in any order (+${s.relegationTrioPartial} per correct team if you don't get all 3). +${s.uclBonus} for the top-4 Champions League places in any order (+${s.uclPartial} per correct team if you don't get all 4).`,
    },
    {
      title: 'Matchday predictions',
      body: `${s.matchdayOutcomePts} point for calling the correct outcome (home / draw / away), plus ${s.matchdayExactBonus} more for the exact scoreline (${s.matchdayOutcomePts + s.matchdayExactBonus} points total). Once per calendar month, use your Joker on one match to double its points.`,
    },
    {
      title: 'Leaderboards',
      body: 'Three leaderboards track your group: Table, Matchweeks, and Overall. Overall ties are broken by exact scorelines hit, then the relegation trio, then the league winner call.',
    },
  ]
}
