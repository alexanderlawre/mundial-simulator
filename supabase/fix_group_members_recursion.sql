-- Hotfix: infinite recursion in the group_members RLS policy.
--
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run standalone (doesn't require re-running the full schema.sql)
-- and safe to re-run (uses create-or-replace / drop-if-exists).
--
-- Root cause: the group_members "members can read roster" SELECT policy
-- checked membership by querying group_members itself. Evaluating that
-- inner query re-triggers the same policy, forever -- Postgres error
-- 42P17 "infinite recursion detected in policy for relation
-- group_members". This was breaking reads on groups, group_members,
-- table_predictions, matchday_predictions, and scores (anything whose
-- policy references group_members), which is why creating/reading a
-- group silently failed.

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

drop policy if exists "group_members: members can read roster" on public.group_members;
create policy "group_members: members can read roster"
  on public.group_members for select
  using (public.is_group_member(group_members.group_id, auth.uid()));
