-- Her days, part 2: photos from the Her days folder in Drive and from the album zip, and lines
-- (captions) drafted in Sujith's voice that only go up once he says so.
-- Additive: widens the allowed values on the Her days tables from part 1, adds columns to them,
-- and adds two new tables. No table outside Her days is changed.

alter table public.import_runs drop constraint if exists import_runs_source_check;
alter table public.import_runs add constraint import_runs_source_check
  check (source in ('google_photos', 'google_drive', 'takeout'));

alter table public.timeline_media drop constraint if exists timeline_media_source_check;
alter table public.timeline_media add constraint timeline_media_source_check
  check (source in ('google_photos', 'google_drive', 'takeout'));

alter table public.timeline_media drop constraint if exists timeline_media_taken_at_source_check;
alter table public.timeline_media add constraint timeline_media_taken_at_source_check
  check (taken_at_source in ('camera', 'google_photos', 'file_name', 'added', 'set_by_hand', 'unknown'));

-- Where each picked item's bytes are: a file in the Her days folder, or one entry inside the album zip.
alter table public.import_items add column if not exists source text not null default 'google_photos';
alter table public.import_items add column if not exists drive_file_id text;
alter table public.import_items add column if not exists zip_entry jsonb;
alter table public.import_items add column if not exists description text;
alter table public.import_items add column if not exists taken_at_source text;

-- A drafted line for one photo. It shows on her pages only after Sujith keeps it (or writes his own),
-- which copies the words into media_assets.caption.
create table if not exists public.caption_drafts (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  draft text not null,
  status text not null default 'waiting' check (status in ('waiting', 'kept', 'rewritten', 'no_line', 'redrafted')),
  final_text text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index if not exists caption_drafts_one_waiting on public.caption_drafts (media_asset_id) where status = 'waiting';
create index if not exists caption_drafts_waiting on public.caption_drafts (created_at) where status = 'waiting';

-- Small notes Pawpaw keeps for itself: when the folder was last checked, whether the album is listed.
create table if not exists public.her_days_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.caption_drafts enable row level security;
alter table public.her_days_state enable row level security;
revoke all on public.caption_drafts, public.her_days_state from anon, authenticated;
grant select, insert, update, delete on public.caption_drafts, public.her_days_state to service_role;

-- Taking the "check the folder" turn: only one check runs at a time, and a check that died is
-- taken over after 10 minutes. Returns true when the caller may go ahead.
create or replace function public.take_her_days_turn(p_key text, p_every_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_row public.her_days_state;
begin
  insert into public.her_days_state (key, value, updated_at) values (p_key, '{}'::jsonb, now() - interval '1 day')
  on conflict (key) do nothing;
  select * into v_row from public.her_days_state where key = p_key for update;
  if v_row.value ? 'running_since' and (v_row.value->>'running_since')::timestamptz > now() - interval '10 minutes' then
    return false;
  end if;
  if v_row.updated_at > now() - make_interval(secs => p_every_seconds) then
    return false;
  end if;
  update public.her_days_state set value = value || jsonb_build_object('running_since', now()), updated_at = now() where key = p_key;
  return true;
end;
$$;
revoke execute on function public.take_her_days_turn(text, integer) from public, anon, authenticated;
grant execute on function public.take_her_days_turn(text, integer) to service_role;

-- A video waits for the video service to finish before its still is taken and it goes on her days.
alter table public.import_items add column if not exists video_asset_id uuid references public.video_assets(id) on delete set null;
alter table public.import_items drop constraint if exists import_items_status_check;
alter table public.import_items add constraint import_items_status_check
  check (status in ('pending', 'working', 'video_waiting', 'added', 'duplicate', 'failed', 'skipped'));

-- Hands out the next few files to bring in, from one check (p_run_id) or from any (null).
-- Folder photos go before the album, so a new photo never waits behind a thousand old ones.
create or replace function public.claim_import_items(p_run_id uuid, p_limit integer)
returns setof public.import_items language sql security definer set search_path = '' as $$
  update public.import_items set status = 'working', claimed_at = now(), attempts = attempts + 1, updated_at = now()
  where id in (
    select id from public.import_items
    where (p_run_id is null or run_id = p_run_id)
      and (status = 'pending' or (status = 'working' and claimed_at < now() - interval '10 minutes'))
    order by source, taken_at nulls last, id
    limit greatest(1, least(p_limit, 10))
    for update skip locked
  )
  returning *;
$$;
revoke execute on function public.claim_import_items(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_import_items(uuid, integer) to service_role;
