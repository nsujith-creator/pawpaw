import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20260815094500_enable_letter_publication.sql'), 'utf8')

describe('Letter publication migration', () => {
  it('allows only established content types and requires truthful Letter context', () => {
    expect(sql).toContain("v_item.type not in ('story', 'gallery', 'letter', 'moment')")
    expect(sql).toContain('LETTER_PUBLICATION_FIELDS_REQUIRED')
    expect(sql).toContain('v_item.author_display_name')
    expect(sql).toContain('v_item.recipient_display_name')
    expect(sql).toContain('v_item.authored_date')
    expect(sql).toContain('v_item.authored_date_precision')
  })

  it('preserves the private, serialized, immutable publication boundary', () => {
    expect(sql).toContain("where id = p_content_id and type <> 'home'")
    expect(sql).toContain('for update')
    expect(sql).toContain('security definer')
    expect(sql).toContain("set search_path = ''")
    expect(sql).toContain('insert into public.content_revisions')
    expect(sql).toContain('insert into public.content_revision_media')
    expect(sql).toContain('revoke execute on function private.publish_content_revision(uuid, uuid) from public, anon, authenticated')
    expect(sql).toContain('grant execute on function private.publish_content_revision(uuid, uuid) to service_role')
    expect(sql).not.toContain('to authenticated;')
  })
})
