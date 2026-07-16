import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Static checks on the committed migration SQL. These run locally without a
// database and guard the is_active_admin() security posture:
// the function must live in the non-exposed `private` schema, use an empty
// search_path, and be executable only by `authenticated`.

const MIGRATIONS_DIR = join(__dirname, '../../supabase/migrations')

const allMigrationSql = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .map(f => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
  .join('\n')

const rls = readFileSync(join(MIGRATIONS_DIR, '0002_rls_and_admin_policies.sql'), 'utf8')
const bucket = readFileSync(join(MIGRATIONS_DIR, '0003_private_media_bucket.sql'), 'utf8')

describe('is_active_admin migration security', () => {
  it('no migration references public.is_active_admin', () => {
    expect(allMigrationSql).not.toMatch(/public\.is_active_admin/)
  })

  it('the function is created in the private schema', () => {
    expect(rls).toMatch(/create or replace function private\.is_active_admin\(\)/)
  })

  it('the private schema is created before the function', () => {
    const schemaPos = rls.indexOf('create schema if not exists private')
    const funcPos   = rls.indexOf('create or replace function private.is_active_admin')
    expect(schemaPos).toBeGreaterThan(-1)
    expect(funcPos).toBeGreaterThan(schemaPos)
  })

  it('the function is security definer with an empty search_path', () => {
    expect(rls).toMatch(/security definer/)
    expect(rls).toMatch(/set search_path = ''/)
  })

  it('table references inside the function body are fully qualified', () => {
    const body = rls.slice(rls.indexOf('$$'), rls.indexOf('$$;'))
    expect(body).toMatch(/from public\.admin_users/)
    expect(body).toMatch(/auth\.uid\(\)/)
  })

  it('EXECUTE is revoked from public, anon, and authenticated', () => {
    expect(rls).toMatch(/revoke execute on function private\.is_active_admin\(\) from public;/)
    expect(rls).toMatch(/revoke execute on function private\.is_active_admin\(\) from anon;/)
    expect(rls).toMatch(/revoke execute on function private\.is_active_admin\(\) from authenticated;/)
  })

  it('revokes appear before the grant', () => {
    const lastRevoke = rls.lastIndexOf('revoke execute on function private.is_active_admin()')
    const grant      = rls.indexOf('grant execute on function private.is_active_admin()')
    expect(grant).toBeGreaterThan(lastRevoke)
  })

  it('EXECUTE is granted only to authenticated, and only for this function', () => {
    const grants = rls.match(/grant execute[^;]+;/g) ?? []
    expect(grants).toHaveLength(1)
    expect(grants[0]).toBe('grant execute on function private.is_active_admin() to authenticated;')
  })

  it('USAGE on the private schema is granted only to authenticated', () => {
    const usageGrants = rls.match(/grant usage on schema private[^;]+;/g) ?? []
    expect(usageGrants).toHaveLength(1)
    expect(usageGrants[0]).toBe('grant usage on schema private to authenticated;')
  })

  it('every table policy invokes the function as (select private.is_active_admin())', () => {
    // Bare references are legitimate only in the definition block:
    // 1 create + 3 revokes + 1 grant = 5. Policies must use the (select …) form:
    // admin_users using (1) + 3 tables × (using + with check) (6) = 7.
    const bareRefs = rls.match(/(?<!select )private\.is_active_admin\(\)/g) ?? []
    expect(bareRefs).toHaveLength(5)
    expect(rls.match(/\(select private\.is_active_admin\(\)\)/g)?.length).toBe(7)
  })

  it('every Storage policy invokes the function as (select private.is_active_admin())', () => {
    expect(bucket).not.toMatch(/public\.is_active_admin/)
    expect(bucket.match(/\(select private\.is_active_admin\(\)\)/g)?.length).toBe(4)
    expect(bucket.match(/(?<!select )private\.is_active_admin\(\)/g) ?? []).toHaveLength(0)
  })

  it('supabase config does not expose the private schema over the API', () => {
    const config = readFileSync(join(__dirname, '../../supabase/config.toml'), 'utf8')
    const schemasLine = config.match(/schemas = \[(.*)\]/)?.[1] ?? ''
    expect(schemasLine).not.toContain('private')
  })
})
