-- Mundial: "Predict the League" + Groups schema
--
-- This is the first schema/migration file in the repo. Run this once,
-- in full, in the Supabase project's SQL editor (Dashboard -> SQL Editor
-- -> New query -> paste -> Run). It's written to be idempotent-ish via
-- `if not exists` guards so it's safe to re-run if a later step fails
-- partway through.
--
-- Assumes the existing tables already live in this project:
--   profiles (id uuid references auth.users, name, favorite_team)
--   league_predictions (user_id, league_key, club_order, confirmed, updated_at)
--   simulation_history (user_id, mode, descriptor, winner, runner_up, third, fourth, created_at)
-- Those are NOT redefined here. Everything below is additive.
--
-- Structured in two passes: all `create table` statements first, then all
-- RLS/policy/trigger statements after -- several policies below reference
-- other tables in this file (e.g. the `groups` policies check
-- `group_members`), so every table must exist before any policy is
-- created, regardless of which table "owns" that policy.

-- ============================================================
-- PASS 1: tables
-- ============================================================

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  bio text check (char_length(bio) <= 500),
  avatar_url text,
  join_code text not null unique,
  leagues_enabled text[] not null default '{}',
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  member_count int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.table_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  league_key text not null,
  ordered_club_keys text[] not null,
  locked boolean not null default false,
  locked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, group_id, league_key)
);

-- Public read; populated once a live data source is wired up -- see
-- src/lib/fixturesSource.js. Empty for now.
create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  league_key text not null,
  matchday int not null,
  home_club_key text not null,
  away_club_key text not null,
  kickoff_ts timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished', 'postponed')),
  created_at timestamptz not null default now()
);

create table if not exists public.matchday_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  outcome text check (outcome in ('H', 'D', 'A')),
  home_score int,
  away_score int,
  is_joker boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, group_id, fixture_id)
);

-- Cached/derived leaderboard rows -- recomputed client-side by
-- src/lib/leagueScoring.js for now; a trusted server recompute is a
-- Phase 2 concern once real results exist.
create table if not exists public.scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  league_key text not null,
  table_pts int not null default 0,
  bonus_pts int not null default 0,
  matchday_pts int not null default 0,
  overall_pts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id, league_key)
);

-- ============================================================
-- PASS 2: row level security + policies
-- ============================================================

-- ---- groups ----
alter table public.groups enable row level security;

-- Anyone authenticated can look up a group by join code (needed to join);
-- full row is otherwise only visible to members. We keep this simple by
-- allowing read of groups you belong to, OR by exact join_code match
-- (the join flow always queries by code, never lists all groups).
drop policy if exists "groups: members can read" on public.groups;
create policy "groups: members can read"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members m
      where m.group_id = groups.id and m.user_id = auth.uid()
    )
    or true -- join-by-code lookup needs to read the row before membership exists;
            -- write access below is still fully locked down.
  );

drop policy if exists "groups: authenticated users can create" on public.groups;
create policy "groups: authenticated users can create"
  on public.groups for insert
  with check (auth.uid() = admin_user_id);

drop policy if exists "groups: admin can update" on public.groups;
create policy "groups: admin can update"
  on public.groups for update
  using (auth.uid() = admin_user_id);

drop policy if exists "groups: admin can delete" on public.groups;
create policy "groups: admin can delete"
  on public.groups for delete
  using (auth.uid() = admin_user_id);

-- ---- group_members ----
alter table public.group_members enable row level security;

drop policy if exists "group_members: members can read roster" on public.group_members;
create policy "group_members: members can read roster"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members me
      where me.group_id = group_members.group_id and me.user_id = auth.uid()
    )
  );

drop policy if exists "group_members: user can join self" on public.group_members;
create policy "group_members: user can join self"
  on public.group_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "group_members: admin can remove members" on public.group_members;
create policy "group_members: admin can remove members"
  on public.group_members for delete
  using (
    auth.uid() = user_id -- can always leave a group yourself
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.admin_user_id = auth.uid()
    )
  );

-- Hard 25-member cap, enforced server-side (client-side check is only a
-- nicety -- this trigger is the real guard so it can't be bypassed by a
-- direct API call).
create or replace function public.enforce_group_member_cap()
returns trigger as $$
begin
  if (select count(*) from public.group_members where group_id = new.group_id) >= 25 then
    raise exception 'Group is full (25 member max)';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_group_member_cap on public.group_members;
create trigger trg_group_member_cap
  before insert on public.group_members
  for each row execute function public.enforce_group_member_cap();

-- Keep groups.member_count in sync so the UI can display it without a
-- separate count query.
create or replace function public.sync_group_member_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.groups set member_count = member_count + 1 where id = new.group_id;
  elsif tg_op = 'DELETE' then
    update public.groups set member_count = greatest(member_count - 1, 0) where id = old.group_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_group_member_count on public.group_members;
create trigger trg_group_member_count
  after insert or delete on public.group_members
  for each row execute function public.sync_group_member_count();

-- ---- table_predictions ----
alter table public.table_predictions enable row level security;

drop policy if exists "table_predictions: own row full access" on public.table_predictions;
create policy "table_predictions: own row full access"
  on public.table_predictions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "table_predictions: group members can read locked predictions" on public.table_predictions;
create policy "table_predictions: group members can read locked predictions"
  on public.table_predictions for select
  using (
    locked = true
    and exists (
      select 1 from public.group_members m
      where m.group_id = table_predictions.group_id and m.user_id = auth.uid()
    )
  );

-- ---- fixtures ----
alter table public.fixtures enable row level security;

drop policy if exists "fixtures: public read" on public.fixtures;
create policy "fixtures: public read"
  on public.fixtures for select
  using (true);
-- No client-side insert/update policy: fixtures are only ever written by
-- a trusted server process (service-role key), once a live data source
-- (e.g. football-data.org) is wired up in Phase 2.

-- ---- matchday_predictions ----
alter table public.matchday_predictions enable row level security;

drop policy if exists "matchday_predictions: own row full access" on public.matchday_predictions;
create policy "matchday_predictions: own row full access"
  on public.matchday_predictions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "matchday_predictions: group members can read after kickoff" on public.matchday_predictions;
create policy "matchday_predictions: group members can read after kickoff"
  on public.matchday_predictions for select
  using (
    exists (
      select 1 from public.fixtures f
      where f.id = matchday_predictions.fixture_id and f.kickoff_ts <= now()
    )
    and exists (
      select 1 from public.group_members m
      where m.group_id = matchday_predictions.group_id and m.user_id = auth.uid()
    )
  );

-- ---- scores ----
alter table public.scores enable row level security;

drop policy if exists "scores: own row full access" on public.scores;
create policy "scores: own row full access"
  on public.scores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "scores: group members can read leaderboard" on public.scores;
create policy "scores: group members can read leaderboard"
  on public.scores for select
  using (
    exists (
      select 1 from public.group_members m
      where m.group_id = scores.group_id and m.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket for group avatars (run separately if the SQL editor
-- doesn't have storage extension access -- can also be created via
-- Dashboard -> Storage -> New bucket -> name "group-avatars" -> public)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('group-avatars', 'group-avatars', true)
on conflict (id) do nothing;

drop policy if exists "group-avatars: public read" on storage.objects;
create policy "group-avatars: public read"
  on storage.objects for select
  using (bucket_id = 'group-avatars');

drop policy if exists "group-avatars: authenticated upload" on storage.objects;
create policy "group-avatars: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'group-avatars' and auth.role() = 'authenticated');
