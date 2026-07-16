-- Migration 0003: Private media Storage bucket and policies.
-- The bucket is not public. Anonymous reads are denied by policy absence.
-- Service role bypasses RLS and is used server-side for signed URL generation.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  10485760,   -- 10 MB application limit (Supabase Free hard limit is 50 MB)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Active admins can upload.
create policy "active_admins_upload_media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and public.is_active_admin()
  );

-- Active admins can read (for the admin UI).
create policy "active_admins_read_media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_active_admin()
  );

-- Active admins can update (e.g. focal point re-crop replacement).
create policy "active_admins_update_media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_active_admin()
  );

-- Active admins can delete objects not referenced by any content_media row.
-- Referential integrity on content_media prevents silent loss of referenced media.
create policy "active_admins_delete_media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_active_admin()
  );
