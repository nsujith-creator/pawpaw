-- Her days: every photo and video of her, placed at the moment it was taken, and the history of
-- every import that brought them in. Additive only: no existing table or function changes.
--
-- timeline_media  one row per photo or video on her days. A video also has a still (media_asset_id).
-- import_runs     one row each time someone brings photos in from Google Photos.
-- import_items    one row per picked photo or video, with what happened to it.
--
-- Service role only, like family_lists: browsers never read these tables directly.

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('google_photos')),
  picker_session_id text,
  picker_expires_at timestamptz,
  status text not null default 'picking' check (status in ('picking', 'importing', 'done', 'expired', 'cancelled')),
  started_by uuid not null,
  started_at timestamptz not null default now(),
  listed_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.timeline_media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('photo', 'video')),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  video_asset_id uuid references public.video_assets(id) on delete set null,
  taken_at timestamptz,
  taken_at_source text not null check (taken_at_source in ('camera', 'set_by_hand', 'unknown')),
  visibility text not null default 'shown' check (visibility in ('shown', 'hidden', 'review')),
  review_reason text,
  source text not null check (source in ('google_photos', 'takeout')),
  source_item_id text not null,
  source_filename text,
  width integer,
  height integer,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_item_id)
);
create index if not exists timeline_media_shown_taken_at on public.timeline_media (taken_at) where visibility = 'shown';
create index if not exists timeline_media_review on public.timeline_media (created_at) where visibility = 'review';

create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.import_runs(id) on delete cascade,
  source_item_id text not null,
  kind text not null check (kind in ('photo', 'video')),
  mime_type text,
  filename text,
  taken_at timestamptz,
  width integer,
  height integer,
  -- Google's download address for this item. It only works for about an hour, and only with the
  -- picker's own sign-in, so it is cleared as soon as the item is in.
  google_base_url text,
  video_ready boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'working', 'added', 'duplicate', 'failed')),
  attempts integer not null default 0,
  error text,
  timeline_media_id uuid references public.timeline_media(id) on delete set null,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (run_id, source_item_id)
);
create index if not exists import_items_run_status on public.import_items (run_id, status);

alter table public.import_runs enable row level security;
alter table public.timeline_media enable row level security;
alter table public.import_items enable row level security;
revoke all on public.import_runs, public.timeline_media, public.import_items from anon, authenticated;
grant select, insert, update, delete on public.import_runs, public.timeline_media, public.import_items to service_role;

-- Hands out the next few items to bring in. An item left 'working' for 10 minutes (a closed tab,
-- a function that ran out of time; longer than any one call may run) is handed out again.
create or replace function public.claim_import_items(p_run_id uuid, p_limit integer)
returns setof public.import_items language sql security definer set search_path = '' as $$
  update public.import_items set status = 'working', claimed_at = now(), attempts = attempts + 1, updated_at = now()
  where id in (
    select id from public.import_items
    where run_id = p_run_id
      and (status = 'pending' or (status = 'working' and claimed_at < now() - interval '10 minutes'))
    order by taken_at nulls last, id
    limit greatest(1, least(p_limit, 10))
    for update skip locked
  )
  returning *;
$$;
revoke execute on function public.claim_import_items(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_import_items(uuid, integer) to service_role;
