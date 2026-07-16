-- Migration 0001: Initial schema
-- Creates admin_users, content_items, media_assets, content_media tables.

-- Administrator allowlist keyed by Supabase Auth user ID.
create table public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- All publishable content. body_blocks is validated by the server before write.
create table public.content_items (
  id             uuid primary key default gen_random_uuid(),
  type           text not null check (type in ('home','story','gallery','letter','moment')),
  slug           text not null unique,
  title          text not null,
  summary        text,
  body_blocks    jsonb not null default '[]'::jsonb,
  status         text not null default 'draft' check (status in ('draft','published')),
  cover_media_id uuid,
  published_at   timestamptz,
  created_by     uuid not null references auth.users(id),
  updated_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- All uploaded photographs and media. No public URL column.
create table public.media_assets (
  id                uuid primary key default gen_random_uuid(),
  storage_path      text not null unique,
  mime_type         text not null,
  byte_size         bigint not null,
  width             integer,
  height            integer,
  alt_text          text,
  caption           text,
  focal_x           numeric(4,3),
  focal_y           numeric(4,3),
  extracted_palette jsonb,
  processing_status text not null default 'pending'
                    check (processing_status in ('pending','ready','error')),
  processing_error  text,
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now()
);

-- Join table: content ↔ media. Deletion is blocked if media is still referenced.
create table public.content_media (
  content_id       uuid not null references public.content_items(id) on delete cascade,
  media_id         uuid not null references public.media_assets(id) on delete restrict,
  sort_order       integer not null default 0,
  caption_override text,
  placement        text,
  primary key (content_id, media_id)
);

-- Deferred FK: cover_media_id references media_assets which is created above.
alter table public.content_items
  add constraint content_items_cover_media_id_fkey
  foreign key (cover_media_id) references public.media_assets(id) on delete set null;

-- Shared trigger function for updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();
