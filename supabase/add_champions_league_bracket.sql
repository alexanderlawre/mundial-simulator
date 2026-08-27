-- Adds cloud persistence for Champions League knockout bracket picks
-- (play-off round + Round of 16 -> Final), solo and group-scoped, mirroring
-- the existing league_predictions / table_predictions split. Brackets are
-- personal predictions -- own-row-access only, no group-visibility of other
-- members' brackets, no scoring/leaderboard (out of scope for v1).
--
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run standalone and safe to re-run (every statement is
-- idempotent: `create table if not exists`, `drop policy if exists` before
-- every `create policy`).

-- ============================================================
-- league_brackets: solo bracket progress
-- ============================================================
create table if not exists public.league_brackets (
  user_id uuid not null references auth.users(id) on delete cascade,
  league_key text not null,
  match_state jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, league_key)
);

alter table public.league_brackets enable row level security;

drop policy if exists "league_brackets: own row full access" on public.league_brackets;
create policy "league_brackets: own row full access"
  on public.league_brackets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- group_brackets: group-scoped bracket progress (independent bracket per
-- group, same user)
-- ============================================================
create table if not exists public.group_brackets (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  league_key text not null,
  match_state jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id, league_key)
);

alter table public.group_brackets enable row level security;

drop policy if exists "group_brackets: own row full access" on public.group_brackets;
create policy "group_brackets: own row full access"
  on public.group_brackets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
