// Predictions ("Predict the League" tables, solo and group-scoped) lock at
// this instant: no more edits, and from this point on every user's table
// becomes visible to any other signed-in user. Kept in one place so every
// UI surface (LeaguePredict, GroupLeaguePredict, GroupDashboard's member
// modal, UserProfile) agrees on the same moment.
//
// This is a client-side convenience for driving the UI only -- the real
// enforcement is server-side, via the matching timestamp baked into the
// RLS policies in supabase/add_profiles_predictions_lock.sql. A user with a
// skewed device clock can never edit or peek early because of that, no
// matter what this file says.
export const PREDICTIONS_LOCK_AT = new Date('2026-08-21T16:00:00Z') // Fri Aug 21, 2026, 12:00 PM ET (EDT, UTC-4)

export function predictionsLocked() {
  return Date.now() >= PREDICTIONS_LOCK_AT.getTime()
}
