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

const stage4SceneMigration = readFileSync(
  join(MIGRATIONS_DIR, '20260816121500_stage4_explicit_visual_scenes.sql'),
  'utf8',
)

describe('Stage 4 visual-scene migration security', () => {
  it('adds a bounded nullable choice to drafts and immutable revisions', () => {
    expect(stage4SceneMigration).toMatch(/content_items[\s\S]*visual_scene/)
    expect(stage4SceneMigration).toMatch(/content_revisions[\s\S]*visual_scene/)
    expect(stage4SceneMigration).toMatch(/check \(visual_scene is null or visual_scene in/)
  })

  it('snapshots the explicit scene without broadening policies or public grants', () => {
    expect(stage4SceneMigration).toContain('v_item.visual_scene')
    expect(stage4SceneMigration).not.toMatch(/create policy|alter policy|grant (select|insert|update|delete|all) on/i)
  })
})

const rls = readFileSync(join(MIGRATIONS_DIR, '0002_rls_and_admin_policies.sql'), 'utf8')
const bucket = readFileSync(join(MIGRATIONS_DIR, '0003_private_media_bucket.sql'), 'utf8')
const privileges = readFileSync(join(MIGRATIONS_DIR, '0005_table_privileges.sql'), 'utf8')
const searchPathFix = readFileSync(
  join(MIGRATIONS_DIR, '0006_lock_set_updated_at_search_path.sql'),
  'utf8',
)

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

// Static enforcement of the table-privilege posture in 0005:
// service_role gets full DML, authenticated gets only what RLS then gates
// (and can never write admin_users), anon gets nothing.

const TABLES = [
  'admin_users',
  'content_items',
  'media_assets',
  'content_media',
  'viewer_login_attempts',
] as const

// SQL statements without comments, whitespace-normalized for exact matching.
const privilegeStatements = privileges
  .split('\n')
  .filter(line => !line.trimStart().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .map(s => `${s};`)

const grants  = privilegeStatements.filter(s => s.startsWith('grant '))
const revokes = privilegeStatements.filter(s => s.startsWith('revoke '))

describe('table privileges migration (0005)', () => {
  it('contains only grant and revoke statements — no schema or policy changes', () => {
    expect(privilegeStatements.length).toBe(grants.length + revokes.length)
  })

  it('revokes all privileges from anon, authenticated, and service_role on every table first', () => {
    for (const table of TABLES) {
      expect(revokes).toContain(
        `revoke all on table public.${table} from anon, authenticated, service_role;`,
      )
    }
    expect(revokes).toHaveLength(TABLES.length)
  })

  it('all revokes appear before the first grant', () => {
    const firstGrant = privilegeStatements.findIndex(s => s.startsWith('grant '))
    const lastRevoke = privilegeStatements.map(s => s.startsWith('revoke ')).lastIndexOf(true)
    expect(lastRevoke).toBeLessThan(firstGrant)
  })

  it('service_role receives exactly select, insert, update, delete on every table', () => {
    for (const table of TABLES) {
      expect(grants).toContain(
        `grant select, insert, update, delete on table public.${table} to service_role;`,
      )
    }
  })

  it('authenticated receives only SELECT on admin_users and DML on the content tables', () => {
    const authGrants = grants.filter(s => s.endsWith('to authenticated;')).sort()
    expect(authGrants).toEqual([
      'grant select on table public.admin_users to authenticated;',
      'grant select, insert, update, delete on table public.content_items to authenticated;',
      'grant select, insert, update, delete on table public.content_media to authenticated;',
      'grant select, insert, update, delete on table public.media_assets to authenticated;',
    ])
  })

  it('authenticated is never granted INSERT, UPDATE, or DELETE on admin_users', () => {
    const adminUserGrants = grants.filter(
      s => s.includes('public.admin_users') && s.endsWith('to authenticated;'),
    )
    for (const g of adminUserGrants) {
      expect(g).not.toMatch(/insert|update|delete/)
    }
  })

  it('viewer_login_attempts is granted only to service_role', () => {
    const vlaGrants = grants.filter(s => s.includes('viewer_login_attempts'))
    expect(vlaGrants).toEqual([
      'grant select, insert, update, delete on table public.viewer_login_attempts to service_role;',
    ])
  })

  it('there are no grants beyond the expected nine', () => {
    // 5 tables × service_role + 4 tables × authenticated.
    expect(grants).toHaveLength(9)
  })

  it('anon is never granted anything in any migration', () => {
    const allStatements = allMigrationSql
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--'))
      .join('\n')
      .split(';')
    for (const stmt of allStatements) {
      const s = stmt.replace(/\s+/g, ' ').trim()
      if (s.startsWith('grant ')) expect(s).not.toMatch(/\banon\b/)
    }
  })

  it('no migration uses broad grants or default privileges', () => {
    const withoutComments = allMigrationSql
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--'))
      .join('\n')
    expect(withoutComments).not.toMatch(/all tables in schema/i)
    expect(withoutComments).not.toMatch(/alter default privileges/i)
  })
})

// Static enforcement of the search_path fix in 0006: the exact
// zero-argument function signature must get an empty search_path.

describe('set_updated_at search_path migration (0006)', () => {
  const statements = searchPathFix
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(s => `${s};`)

  it('contains exactly one statement', () => {
    expect(statements).toHaveLength(1)
  })

  it("sets an empty search_path on public.set_updated_at()'s exact signature", () => {
    expect(statements[0]).toBe(
      "alter function public.set_updated_at() set search_path = '';",
    )
  })

  it('does not recreate or drop the function', () => {
    expect(searchPathFix).not.toMatch(/create (or replace )?function/i)
    expect(searchPathFix).not.toMatch(/drop function/i)
  })
})
