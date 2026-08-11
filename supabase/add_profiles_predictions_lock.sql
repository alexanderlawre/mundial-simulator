-- Adds: user avatars, a public "pinned/spotlighted" flag on simulation
-- history, and a hard prediction-lock deadline (Tue Sep 1, 2026, 12:01 AM
-- ET / 04:01 UTC -- right as the summer transfer window closes; September
-- is within US daylight saving, so ET = EDT = UTC-4). Before this deadline,
-- predictions are private to their owner and freely editable; from this
-- instant on, they're read-only and visible to any signed-in user (used by
-- the new /profile/:userId page and the group Members tab).
--
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run standalone and safe to re-run (every statement is
-- idempotent: `add column if not exists`, `drop policy if exists` before
-- every `create policy`).

-- ============================================================
-- Columns
-- ============================================================

alter table public.profiles add column if not exists avatar_url text;

-- Local-only today (see PINNED_SIMULATIONS_KEY in src/lib/storage.js) --
-- promoted to a real column so a pinned run can be read by *other* users
-- on a profile page, not just mirrored in the owner's own browser.
alter table public.simulation_history add column if not exists pinned boolean not null default false;

-- ============================================================
-- profiles: row level security
-- ============================================================
alter table public.profiles enable row level security;

-- Only name/favorite_team/avatar_url live in this table (no email --
-- that's auth.users, never exposed by this policy), so a broad
-- any-authenticated-user read is safe and is what makes group member
-- rosters + public profile pages work.
drop policy if exists "profiles: any authenticated user can read" on public.profiles;
create policy "profiles: any authenticated user can read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles: own row can update" on public.profiles;
create policy "profiles: own row can update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- league_predictions: row level security
-- ============================================================
alter table public.league_predictions enable row level security;

-- Full access to your own row, but only *before* the deadline -- this is
-- the server-side half of "predictions lock on Sep 1" (the client also
-- disables the editing UI past this instant, but this is what actually
-- can't be bypassed).
drop policy if exists "league_predictions: own row full access before lock" on public.league_predictions;
create policy "league_predictions: own row full access before lock"
  on public.league_predictions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and now() < '2026-09-01T04:01:00Z'::timestamptz);

-- Once locked, any signed-in user can read anyone's predicted table
-- (matches "we can view everyone's predicted table once the league season
-- begins").
drop policy if exists "league_predictions: readable by anyone after lock" on public.league_predictions;
create policy "league_predictions: readable by anyone after lock"
  on public.league_predictions for select
  using (now() >= '2026-09-01T04:01:00Z'::timestamptz);

-- ============================================================
-- simulation_history: row level security
-- ============================================================
alter table public.simulation_history enable row level security;

drop policy if exists "simulation_history: own row full access" on public.simulation_history;
create policy "simulation_history: own row full access"
  on public.simulation_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Spotlighted (pinned) runs are the whole point of "showcasing" them on a
-- profile -- readable by anyone once pinned, everything else stays private.
drop policy if exists "simulation_history: pinned rows are publicly readable" on public.simulation_history;
create policy "simulation_history: pinned rows are publicly readable"
  on public.simulation_history for select
  using (pinned = true);

-- ============================================================
-- table_predictions: replace the manual-confirm-based read policy with
-- the same hard deadline, and open it up app-wide (not just group
-- members) for consistency with league_predictions above.
-- ============================================================

drop policy if exists "table_predictions: group members can read locked predictions" on public.table_predictions;
drop policy if exists "table_predictions: readable by anyone after lock" on public.table_predictions;
create policy "table_predictions: readable by anyone after lock"
  on public.table_predictions for select
  using (now() >= '2026-09-01T04:01:00Z'::timestamptz);
-- Note: "table_predictions: own row full access" (existing policy, see
-- schema.sql) already covers the owner reading/writing their own row at
-- any time -- untouched by this migration.

-- ============================================================
-- Storage bucket for user avatars (mirrors the group-avatars block in
-- schema.sql)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

drop policy if exists "user-avatars: public read" on storage.objects;
create policy "user-avatars: public read"
  on storage.objects for select
  using (bucket_id = 'user-avatars');

drop policy if exists "user-avatars: authenticated upload" on storage.objects;
create policy "user-avatars: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'user-avatars' and auth.role() = 'authenticated');
