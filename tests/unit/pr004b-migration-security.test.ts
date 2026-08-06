import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const migrations = join(__dirname, '../../supabase/migrations')
const filename = readdirSync(migrations).find(name => name.endsWith('_pr004b_content_revisions_and_context.sql'))
if (!filename) throw new Error('PR-004B Stage 2 migration is missing')
const sql = readFileSync(join(migrations, filename), 'utf8')

describe('PR-004B Stage 2 migration security contract', () => {
  it('creates immutable revisions, immutable media snapshots, and a same-item selected pointer', () => {
    expect(sql).toContain('create table public.content_revisions')
    expect(sql).toContain('create table public.content_revision_media')
    expect(sql).toContain('content_items_active_revision_same_item_fkey')
    expect(sql).toContain('references public.content_revisions(content_item_id, id)')
    expect(sql).toContain('content_revisions_immutable')
    expect(sql).toContain('content_revision_media_immutable')
  })

  it('creates indexes before a populated backfill can leave deferred cover checks pending', () => {
    const firstIndex = sql.indexOf('create index content_items_active_published_revision_idx')
    const lastSchemaGrant = sql.indexOf('grant execute on function public.update_shared_media_details(uuid,uuid,text,text) to service_role')
    const backfillMarker = sql.indexOf('-- Run the populated backfill after every schema-changing statement.')
    const backfill = sql.indexOf('insert into public.content_revisions (', backfillMarker)
    expect(firstIndex).toBeGreaterThan(-1)
    expect(backfillMarker).toBeGreaterThan(lastSchemaGrant)
    expect(backfill).toBeGreaterThan(firstIndex)
    expect(backfill).toBeGreaterThan(lastSchemaGrant)
    expect(sql).not.toContain('set constraints content_revisions_cover_membership_fkey immediate')
  })

  it('enables RLS, gives active admins read access, and gives anon no table access', () => {
    expect(sql).toContain('alter table public.content_revisions enable row level security')
    expect(sql).toContain('alter table public.content_revision_media enable row level security')
    expect(sql).toContain('using ((select private.is_active_admin()))')
    expect(sql).toContain('revoke all on table public.content_revisions from anon, authenticated, service_role')
    expect(sql).not.toMatch(/to authenticated\s+using\s*\(\s*true\s*\)/i)
  })

  it('keeps privileged work private with fixed search paths and exact wrapper grants', () => {
    expect(sql).toContain('create or replace function private.publish_content_revision')
    expect(sql).toContain('create or replace function private.unpublish_content_revision')
    expect(sql.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(10)
    expect(sql).toContain('revoke execute on function public.publish_content_revision(uuid, uuid) from public, anon, authenticated')
    expect(sql).toContain('grant execute on function public.publish_content_revision(uuid, uuid) to service_role')
    expect(sql).not.toContain('grant execute on function public.publish_content_revision(uuid, uuid) to authenticated')
  })

  it('serializes publication, snapshots media, rejects Letter, and preserves history on unpublish', () => {
    expect(sql).toMatch(/where id = p_content_id and type <> 'home'\s+for update/i)
    expect(sql).toContain('PR004B_LETTER_PUBLICATION_FORBIDDEN')
    expect(sql).toContain('insert into public.content_revision_media')
    expect(sql).toContain("set active_published_revision_id = null")
    expect(sql).not.toMatch(/delete from public\.content_revisions/i)
    expect(sql).not.toMatch(/update public\.content_revisions/i)
  })

  it('restores shared-admin policies without treating creator or storage prefix as authority', () => {
    expect(sql).toContain('create policy "active_admins_all_media_assets"')
    expect(sql).toContain('create policy "active_admins_all_content_media"')
    const stage2 = sql.slice(sql.indexOf('-- Restore the locked shared-admin rule'))
    expect(stage2).not.toContain('created_by = (select auth.uid())')
    expect(stage2).not.toContain('(storage.foldername(name))[1] = (select auth.uid())::text')
    expect(sql).toContain('join public.content_revision_media crm on crm.media_id = ma.id')
    expect(sql).toContain('where ma.storage_path = storage.objects.name')
  })
})
