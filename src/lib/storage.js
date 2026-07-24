import { supabase } from './supabaseClient'

const PROFILE_KEY = 'mundial.profile'
const TOURNAMENT_KEY = 'mundial.activeTournament'
const LEAGUE_PREDICTIONS_KEY = 'mundial.leaguePredictions'

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function getProfile() {
  return safeParse(localStorage.getItem(PROFILE_KEY), null)
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY)
}

export function getActiveTournament() {
  return safeParse(localStorage.getItem(TOURNAMENT_KEY), null)
}

export function saveActiveTournament(state) {
  localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(state))
}

export function clearActiveTournament() {
  localStorage.removeItem(TOURNAMENT_KEY)
}

// ---------- "Predict the League" predictions ----------
// Dictionary keyed by league so a user can have independent in-progress /
// confirmed predictions for all leagues at once. Shape per entry:
// { order: (string|null)[20], confirmed: boolean, updatedAt: number }
// order[i] = club key at table position i (0 = 1st place), or null for an
// empty slot. The unplaced pool is never stored here -- it's always
// derived (alphabeticalClubKeys(league) minus non-null order entries) so
// pool and table can never desync.

export function getLeaguePredictions() {
  return safeParse(localStorage.getItem(LEAGUE_PREDICTIONS_KEY), {})
}

export function getLeaguePrediction(leagueKey) {
  return getLeaguePredictions()[leagueKey] || null
}

export function saveLeaguePrediction(leagueKey, state) {
  const all = getLeaguePredictions()
  all[leagueKey] = { ...all[leagueKey], ...state, updatedAt: Date.now() }
  localStorage.setItem(LEAGUE_PREDICTIONS_KEY, JSON.stringify(all))
}

export function clearLeaguePrediction(leagueKey) {
  const all = getLeaguePredictions()
  delete all[leagueKey]
  localStorage.setItem(LEAGUE_PREDICTIONS_KEY, JSON.stringify(all))
}

export function clearAllLeaguePredictions() {
  localStorage.removeItem(LEAGUE_PREDICTIONS_KEY)
}

// ---------- Guest-local simulation history + spotlight pin ----------
// Cloud sync (syncSimulationToCloud/fetchCloudSimulationHistory below) is
// the source of truth for a logged-in user's "Past Simulations" list on
// the Account page. Guests (no Supabase session) have nowhere server-side
// to persist that list, so this mirrors the same entry shape into
// localStorage instead -- capped at 50 entries, newest first.
const LOCAL_SIMULATION_HISTORY_KEY = 'mundial.localSimulationHistory'
const PINNED_SIMULATIONS_KEY = 'mundial.pinnedSimulations'

export function getLocalSimulationHistory() {
  return safeParse(localStorage.getItem(LOCAL_SIMULATION_HISTORY_KEY), [])
}

// entry: { mode, descriptor, winner, runnerUp, third, fourth } -- returns
// the stored record (with its generated id) so the caller can immediately
// reference it, e.g. for a "pin this result" action right after finishing.
export function addLocalSimulationHistory(entry) {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const record = { id, ...entry, created_at: new Date().toISOString() }
  const all = [record, ...getLocalSimulationHistory()].slice(0, 50)
  localStorage.setItem(LOCAL_SIMULATION_HISTORY_KEY, JSON.stringify(all))
  return record
}

// Spotlight/pin: a simple id-keyed set kept in localStorage on the device,
// working equally for cloud `simulation_history` row ids (logged-in users)
// and local-mirror ids (guests) so the "Pin this result" button on the
// celebration screen and the Spotlight section on the Account page always
// agree on the same id space, with no Supabase schema change required.
export function getPinnedSimulationIds() {
  return safeParse(localStorage.getItem(PINNED_SIMULATIONS_KEY), [])
}

export function isSimulationPinned(id) {
  return !!id && getPinnedSimulationIds().includes(id)
}

export function setSimulationPinned(id, pinned) {
  if (!id) return
  const current = getPinnedSimulationIds()
  const next = pinned ? [...new Set([...current, id])] : current.filter((x) => x !== id)
  localStorage.setItem(PINNED_SIMULATIONS_KEY, JSON.stringify(next))
}

// ---------- Analytics (shared across all visitors via serverless API +
// Vercel KV -- see api/signup.js, api/simulation.js, api/admin-data.js.
// Logging calls are fire-and-forget: a network hiccup should never block
// the signup/celebration flow for the user, so failures are swallowed. ----------

export async function logSignup(profile) {
  try {
    await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
  } catch {
    // best-effort only
  }
}

// entry: { mode: 'historic' | 'custom' | 'wc2026', descriptor, winner, runnerUp, third, fourth }
export async function logSimulationResult(entry) {
  try {
    await fetch('/api/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
  } catch {
    // best-effort only
  }
}

// Fetches the full shared signup + simulation log for the admin dashboard.
// The password is checked server-side (api/admin-data.js) against a secret
// env var -- a wrong password genuinely gets no data back, not just a
// hidden UI, unlike the old client-side-only gate.
export async function fetchAdminData(password) {
  try {
    const res = await fetch('/api/admin-data', {
      headers: { 'x-admin-password': password },
    })
    if (res.status === 401) return { ok: false, unauthorized: true }
    if (!res.ok) return { ok: false, unauthorized: false }
    const data = await res.json()
    return { ok: true, signups: data.signups || [], simulations: data.simulations || [] }
  } catch {
    return { ok: false, unauthorized: false }
  }
}

// ---------- Per-account cloud sync (Supabase) ----------
// Mirrors league predictions and completed-simulation results into the
// logged-in user's own Supabase tables (league_predictions,
// simulation_history -- RLS-protected, see the Phase 2 plan for schema),
// so the Account page can show them across devices. Same fire-and-forget,
// error-swallowing convention as the analytics functions above: local
// (`saveLeaguePrediction`) always stays the source of truth for gameplay,
// cloud sync is a best-effort mirror that never blocks the UI.

export async function syncLeaguePredictionToCloud(userId, leagueKey, state) {
  if (!userId) return
  try {
    await supabase.from('league_predictions').upsert({
      user_id: userId,
      league_key: leagueKey,
      club_order: state.order,
      confirmed: !!state.confirmed,
      updated_at: new Date().toISOString(),
    })
  } catch {
    // best-effort only
  }
}

export async function fetchCloudLeaguePredictions(userId) {
  if (!userId) return {}
  try {
    const { data, error } = await supabase.from('league_predictions').select('*').eq('user_id', userId)
    if (error || !data) return {}
    return Object.fromEntries(data.map((row) => [row.league_key, { order: row.club_order, confirmed: row.confirmed, updatedAt: row.updated_at }]))
  } catch {
    return {}
  }
}

// entry: { mode, descriptor, winner, runnerUp, third, fourth } -- returns
// the inserted row's id (or null on failure) so callers can immediately
// reference this exact simulation, e.g. to pin it right after it finishes.
export async function syncSimulationToCloud(userId, entry) {
  if (!userId) return null
  try {
    const { data, error } = await supabase.from('simulation_history').insert({
      user_id: userId,
      mode: entry.mode,
      descriptor: entry.descriptor,
      winner: entry.winner,
      runner_up: entry.runnerUp,
      third: entry.third,
      fourth: entry.fourth,
    }).select().single()
    if (error) return null
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function fetchCloudSimulationHistory(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}
