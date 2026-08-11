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

// `id` is either a real Supabase `simulation_history` row id (a uuid) for
// logged-in users, or a `local-...` guest-mirror id (see
// addLocalSimulationHistory above) that has no server-side row at all.
// Only the former can be promoted to a cloud `pinned` write -- guest pins
// stay local-only, same as the rest of their history.
function looksLikeCloudSimulationId(id) {
  return typeof id === 'string' && !id.startsWith('local-')
}

export function setSimulationPinned(id, pinned) {
  if (!id) return
  const current = getPinnedSimulationIds()
  const next = pinned ? [...new Set([...current, id])] : current.filter((x) => x !== id)
  localStorage.setItem(PINNED_SIMULATIONS_KEY, JSON.stringify(next))
  // Best-effort mirror to the cloud row's `pinned` column so this result
  // can show up on this user's public profile (/profile/:userId) for
  // other signed-in users to see -- local-only storage above stays the
  // source of truth for the owner's own star-toggle UI either way.
  if (looksLikeCloudSimulationId(id)) {
    supabase.from('simulation_history').update({ pinned }).eq('id', id).then(() => {}, () => {})
  }
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

// ---------- Public profiles (name + team + predictions + spotlight,
// viewable by any signed-in user -- see src/pages/account/UserProfile.jsx)
// ----------
// Deliberately fetch only the columns a profile page is allowed to show
// (name/favorite_team/avatar_url) -- there is no email or other personal
// data in the `profiles` table to accidentally leak here.

export async function fetchPublicProfile(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, favorite_team, avatar_url')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

// Same shape as fetchCloudLeaguePredictions, but for any userId. Before the
// prediction-lock deadline (see src/lib/predictionsLock.js), RLS only
// returns rows belonging to the caller themselves, so this naturally comes
// back empty when viewing someone else's still-locked-to-them-only picks --
// no client-side date check needed for correctness.
export async function fetchPublicPredictions(userId) {
  if (!userId) return {}
  try {
    const { data, error } = await supabase.from('league_predictions').select('*').eq('user_id', userId)
    if (error || !data) return {}
    return Object.fromEntries(data.map((row) => [row.league_key, { order: row.club_order, confirmed: row.confirmed, updatedAt: row.updated_at }]))
  } catch {
    return {}
  }
}

// Only ever returns pinned=true rows for *any* userId thanks to the
// "simulation_history: pinned rows are publicly readable" RLS policy --
// works the same whether userId is the caller or someone else.
export async function fetchPublicSpotlight(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('*')
      .eq('user_id', userId)
      .eq('pinned', true)
      .order('created_at', { ascending: false })
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

// Uploads a profile picture to the public `user-avatars` Supabase Storage
// bucket (created by supabase/add_profiles_predictions_lock.sql) and
// returns its public URL -- mirrors uploadGroupAvatar below exactly.
export async function uploadUserAvatar(userId, file) {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('user-avatars').upload(path, file, { upsert: true })
    if (error) return { ok: false, error: error.message || 'Could not upload photo.' }
    const { data } = supabase.storage.from('user-avatars').getPublicUrl(path)
    return { ok: true, url: data.publicUrl }
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not upload photo.' }
  }
}

export async function updateProfileAvatar(userId, avatarUrl) {
  if (!userId) return { ok: false, error: 'You must be signed in.' }
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (error) return { ok: false, error: error.message || 'Could not save photo.' }
  return { ok: true }
}

// ---------- Groups ("Predict the League" competitions) ----------
// Unlike the fire-and-forget analytics/sync helpers above, these return
// { ok, data } / { ok, error } -- group actions (create/join/admin) are
// the primary action a user is taking, not a best-effort mirror, so the
// UI needs to know if something actually failed (e.g. "group is full",
// enforced server-side by the trigger in supabase/schema.sql).

const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity

function generateJoinCode() {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)]
  }
  return code
}

function friendlyGroupError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  if (/full \(25 member max\)/i.test(error.message || '')) return 'This group is full (25/25 members).'
  if (error.code === '23505') return 'That join code was not found.'
  return error.message || 'Something went wrong. Please try again.'
}

// name/bio/leaguesEnabled/avatarUrl -> creates the group row and adds the
// creator as its first member with role 'admin'. Retries once on a join
// code collision (extremely unlikely at 6 chars from a 33-char alphabet,
// but the column has a uniqueness constraint so we handle it cleanly).
export async function createGroup(userId, { name, bio, leaguesEnabled, avatarUrl }) {
  if (!userId) return { ok: false, error: 'You must be signed in to create a group.' }
  for (let attempt = 0; attempt < 3; attempt++) {
    const joinCode = generateJoinCode()
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        leagues_enabled: leaguesEnabled || [],
        admin_user_id: userId,
        join_code: joinCode,
      })
      .select()
      .single()
    if (!error && data) {
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: data.id, user_id: userId, role: 'admin' })
      if (memberError) return { ok: false, error: friendlyGroupError(memberError) }
      return { ok: true, data }
    }
    if (error?.code !== '23505') return { ok: false, error: friendlyGroupError(error) }
    // 23505 = unique_violation on join_code -- loop and try a new code.
  }
  return { ok: false, error: 'Could not generate a unique join code. Please try again.' }
}

export async function joinGroupByCode(userId, code) {
  if (!userId) return { ok: false, error: 'You must be signed in to join a group.' }
  const normalized = (code || '').trim().toUpperCase()
  if (!normalized) return { ok: false, error: 'Enter a join code.' }
  const { data: group, error: lookupError } = await supabase
    .from('groups')
    .select('*')
    .eq('join_code', normalized)
    .single()
  if (lookupError || !group) return { ok: false, error: 'No group found with that code.' }
  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'member' })
  if (joinError) {
    if (joinError.code === '23505') return { ok: false, error: 'You\u2019re already a member of this group.' }
    return { ok: false, error: friendlyGroupError(joinError) }
  }
  return { ok: true, data: group }
}

export async function fetchUserGroups(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('role, joined_at, groups(*)')
      .eq('user_id', userId)
    if (error || !data) return []
    return data.map((row) => ({ ...row.groups, myRole: row.role, joinedAt: row.joined_at })).filter((g) => g.id)
  } catch {
    return []
  }
}

export async function fetchGroup(groupId) {
  try {
    const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single()
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

// Members joined with their profile name where available -- falls back
// to null (UI shows a generic "Member" label) rather than failing the
// whole roster fetch if a profile row is missing.
export async function fetchGroupMembers(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id, role, joined_at, profiles(name, avatar_url)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })
    if (error || !data) return []
    return data.map((row) => ({
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      name: row.profiles?.name || null,
      avatarUrl: row.profiles?.avatar_url || null,
    }))
  } catch {
    return []
  }
}

export async function updateGroup(groupId, patch) {
  const payload = {}
  if (patch.name !== undefined) payload.name = patch.name
  if (patch.bio !== undefined) payload.bio = patch.bio
  if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl
  if (patch.leaguesEnabled !== undefined) payload.leagues_enabled = patch.leaguesEnabled
  const { error } = await supabase.from('groups').update(payload).eq('id', groupId)
  if (error) return { ok: false, error: friendlyGroupError(error) }
  return { ok: true }
}

export async function regenerateJoinCode(groupId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const joinCode = generateJoinCode()
    const { data, error } = await supabase.from('groups').update({ join_code: joinCode }).eq('id', groupId).select().single()
    if (!error) return { ok: true, data }
    if (error.code !== '23505') return { ok: false, error: friendlyGroupError(error) }
  }
  return { ok: false, error: 'Could not generate a unique join code. Please try again.' }
}

export async function removeGroupMember(groupId, userId) {
  const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
  if (error) return { ok: false, error: friendlyGroupError(error) }
  return { ok: true }
}

export async function leaveGroup(groupId, userId) {
  return removeGroupMember(groupId, userId)
}

// Uploads a group avatar to the public `group-avatars` Supabase Storage
// bucket (created by supabase/schema.sql) and returns its public URL.
export async function uploadGroupAvatar(groupId, file) {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${groupId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('group-avatars').upload(path, file, { upsert: true })
    if (error) return { ok: false, error: friendlyGroupError(error) }
    const { data } = supabase.storage.from('group-avatars').getPublicUrl(path)
    return { ok: true, url: data.publicUrl }
  } catch (e) {
    return { ok: false, error: friendlyGroupError(e) }
  }
}

// ---------- Group-scoped table predictions ----------
// Same shape/convention as the ungrouped league_predictions
// (getLeaguePrediction/syncLeaguePredictionToCloud above), just scoped
// to a specific group so the same user can lock in different table
// calls in different groups.

export async function syncGroupTablePrediction(userId, groupId, leagueKey, state) {
  if (!userId) return { ok: false, error: 'You must be signed in.' }
  const { error } = await supabase.from('table_predictions').upsert(
    {
      user_id: userId,
      group_id: groupId,
      league_key: leagueKey,
      ordered_club_keys: state.order,
      locked: !!state.confirmed,
      locked_at: state.confirmed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,group_id,league_key' }
  )
  if (error) return { ok: false, error: friendlyGroupError(error) }
  return { ok: true }
}

export async function fetchGroupTablePrediction(userId, groupId, leagueKey) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('table_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('league_key', leagueKey)
      .maybeSingle()
    if (error || !data) return null
    return { order: data.ordered_club_keys, confirmed: data.locked, updatedAt: data.updated_at }
  } catch {
    return null
  }
}

// All locked table predictions for a group+league across every member --
// used to render the Table leaderboard once there's an actual final
// table to score against (RLS only returns rows where locked = true, so
// in-progress picks stay private until confirmed).
export async function fetchGroupTablePredictions(groupId, leagueKey) {
  try {
    const { data, error } = await supabase
      .from('table_predictions')
      .select('user_id, ordered_club_keys, locked, profiles(name)')
      .eq('group_id', groupId)
      .eq('league_key', leagueKey)
      .eq('locked', true)
    if (error || !data) return []
    return data.map((row) => ({ userId: row.user_id, order: row.ordered_club_keys, name: row.profiles?.name || null }))
  } catch {
    return []
  }
}

// ---------- Matchday predictions ----------
// Scaffolded alongside src/lib/fixturesSource.js / MatchdayPredict.jsx --
// functionally correct against the schema in supabase/schema.sql, but
// unexercised until a real fixture source provides actual fixture rows
// to predict against (the stub source always returns []).

export async function syncMatchdayPrediction(userId, groupId, fixtureId, { outcome, homeScore, awayScore, isJoker }) {
  if (!userId) return { ok: false, error: 'You must be signed in.' }
  const { error } = await supabase.from('matchday_predictions').upsert(
    {
      user_id: userId,
      group_id: groupId,
      fixture_id: fixtureId,
      outcome,
      home_score: homeScore ?? null,
      away_score: awayScore ?? null,
      is_joker: !!isJoker,
    },
    { onConflict: 'user_id,group_id,fixture_id' }
  )
  if (error) return { ok: false, error: friendlyGroupError(error) }
  return { ok: true }
}

export async function fetchMatchdayPredictions(userId, groupId, fixtureIds) {
  if (!userId || !fixtureIds?.length) return {}
  try {
    const { data, error } = await supabase
      .from('matchday_predictions')
      .select('*')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .in('fixture_id', fixtureIds)
    if (error || !data) return {}
    return Object.fromEntries(
      data.map((row) => [
        row.fixture_id,
        { outcome: row.outcome, homeScore: row.home_score, awayScore: row.away_score, isJoker: row.is_joker },
      ])
    )
  } catch {
    return {}
  }
}
