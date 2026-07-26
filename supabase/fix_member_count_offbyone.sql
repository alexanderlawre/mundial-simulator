-- Hotfix: groups.member_count started 1 too high for every group.
--
-- Run this once in the Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run standalone and safe to re-run.
--
-- Root cause: groups.member_count defaulted to 1 (assuming the creator),
-- but the trg_group_member_count trigger ALSO increments member_count by 1
-- on every group_members insert -- including the admin's own row that
-- createGroup() always inserts right after creating the group row. Net
-- result: every group's displayed member count was 1 higher than its real
-- membership (a brand-new group showed "2 members" instead of "1").
--
-- Fix: change the column default to 0 (so the trigger is the only thing
-- that ever increments it), then recompute every existing group's count
-- from the real group_members rows so already-created groups show the
-- correct number immediately.

alter table public.groups alter column member_count set default 0;

update public.groups g
set member_count = (
  select count(*) from public.group_members gm where gm.group_id = g.id
);
