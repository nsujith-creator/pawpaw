-- Private Cloudflare Stream records. Video bytes and playback tokens never enter Supabase.
create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  cloudflare_uid text not null unique,
  status text not null default 'uploading' check (status in ('uploading', 'processing', 'ready', 'errored')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  caption text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table public.content_videos (
  content_id uuid not null references public.content_items(id) on delete restrict,
  video_id uuid not null references public.video_assets(id) on delete restrict,
  sort_order integer not null check (sort_order >= 0),
  caption_override text,
  primary key (content_id, video_id),
  unique (content_id, sort_order)
);

create table public.content_revision_videos (
  revision_id uuid not null references public.content_revisions(id) on delete restrict,
  video_id uuid not null references public.video_assets(id) on delete restrict,
  sort_order integer not null check (sort_order >= 0),
  cloudflare_uid text not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  caption text,
  caption_override text,
  primary key (revision_id, video_id),
  unique (revision_id, sort_order)
);

alter table public.video_assets enable row level security;
alter table public.content_videos enable row level security;
alter table public.content_revision_videos enable row level security;
revoke all on table public.video_assets, public.content_videos, public.content_revision_videos from anon, authenticated;
grant select, insert, update, delete on table public.video_assets, public.content_videos, public.content_revision_videos to service_role;

create or replace function private.reject_revision_video_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'VIDEO_REVISION_IMMUTABLE' using errcode = '55000';
end;
$$;
revoke execute on function private.reject_revision_video_mutation() from public, anon, authenticated;

create trigger content_revision_videos_immutable
  before update or delete on public.content_revision_videos
  for each row execute function private.reject_revision_video_mutation();

-- Each newly published revision receives its own immutable copy of the ready video list.
create or replace function private.snapshot_revision_videos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.content_videos cv
    join public.video_assets va on va.id = cv.video_id
    where cv.content_id = new.content_item_id and va.status <> 'ready'
  ) then
    raise exception 'VIDEO_PROCESSING_NOT_READY' using errcode = '23514';
  end if;
  insert into public.content_revision_videos (
    revision_id, video_id, sort_order, cloudflare_uid, duration_seconds, caption, caption_override
  )
  select new.id, va.id, cv.sort_order, va.cloudflare_uid, va.duration_seconds, va.caption, cv.caption_override
  from public.content_videos cv
  join public.video_assets va on va.id = cv.video_id
  where cv.content_id = new.content_item_id
  order by cv.sort_order, va.id;
  return new;
end;
$$;
revoke execute on function private.snapshot_revision_videos() from public, anon, authenticated;

create trigger snapshot_revision_videos
  after insert on public.content_revisions
  for each row execute function private.snapshot_revision_videos();

create or replace function public.attach_owned_video(p_admin_id uuid, p_content_id uuid, p_video_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_sort_order integer;
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'VIDEO_ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  perform 1 from public.content_items where id = p_content_id and type <> 'home' for update;
  if not found or not exists (select 1 from public.video_assets where id = p_video_id) then raise exception 'VIDEO_OR_CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if exists (select 1 from public.content_videos where content_id = p_content_id and video_id = p_video_id) then raise exception 'Video is already attached' using errcode = '23505'; end if;
  select coalesce(max(sort_order), -1) + 1 into v_sort_order from public.content_videos where content_id = p_content_id;
  insert into public.content_videos(content_id, video_id, sort_order) values (p_content_id, p_video_id, v_sort_order);
  update public.content_items set updated_by = p_admin_id, updated_at = clock_timestamp() where id = p_content_id;
  return v_sort_order;
end;
$$;
revoke execute on function public.attach_owned_video(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.attach_owned_video(uuid, uuid, uuid) to service_role;
