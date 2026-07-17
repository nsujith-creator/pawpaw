import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const NEW_EMAIL = /^pawpaw-test-[a-z0-9-]+@example\.invalid$/
const LEGACY_EMAIL = /^it-(?:du-(?:admin|nonadmin)|mm-(?:admin|nonadmin)|editor|admin|nonadmin)-\d+@example\.com$/

function isPawpawFixtureUser(user: User): boolean {
  const email = user.email ?? ''
  const metadata = user.user_metadata ?? {}
  const tagged = NEW_EMAIL.test(email) && metadata.pawpaw_test_fixture === true &&
    metadata.repository === 'pawpaw'
  return tagged || LEGACY_EMAIL.test(email)
}

async function listFixtureUsers(db: SupabaseClient): Promise<User[]> {
  const fixtures: User[] = []
  for (let page = 1; ;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    fixtures.push(...data.users.filter(isPawpawFixtureUser))
    if (data.nextPage === null) return fixtures
    page = data.nextPage
  }
}

async function listFolderPaths(db: SupabaseClient, userId: string): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.storage.from('media').list(userId, {
      limit: 100, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw error
    for (const object of data ?? []) paths.push(`${userId}/${object.name}`)
    if ((data ?? []).length < 100) return paths
  }
}

async function removeFixtureUser(db: SupabaseClient, user: User): Promise<void> {
  const { data: media, error: mediaReadError } = await db
    .from('media_assets').select('id, storage_path').eq('created_by', user.id)
  if (mediaReadError) throw mediaReadError
  const mediaIds = (media ?? []).map(row => row.id as string)
  if (mediaIds.length) {
    const { error } = await db.from('content_media').delete().in('media_id', mediaIds)
    if (error) throw error
  }
  const { error: contentError } = await db.from('content_items').delete().eq('created_by', user.id)
  if (contentError) throw contentError
  const { error: mediaError } = await db.from('media_assets').delete().eq('created_by', user.id)
  if (mediaError) throw mediaError

  const paths = await listFolderPaths(db, user.id)
  if (paths.length) {
    const { error } = await db.storage.from('media').remove(paths)
    if (error) throw error
  }
  const { error: allowlistError } = await db.from('admin_users').delete().eq('user_id', user.id)
  if (allowlistError) throw allowlistError
  const { error: authError } = await db.auth.admin.deleteUser(user.id)
  if (authError) throw authError
}

async function countFixtures(db: SupabaseClient) {
  const users = await listFixtureUsers(db)
  const { count: content } = await db.from('content_items')
    .select('id', { count: 'exact', head: true }).like('slug', 'pawpaw-test-%')
  const { count: media } = await db.from('media_assets')
    .select('id', { count: 'exact', head: true }).like('storage_path', '%/pawpaw-test-%')
  let objects = 0
  for (const user of users) objects += (await listFolderPaths(db, user.id)).length
  return { users: users.length, content: content ?? 0, media: media ?? 0, objects }
}

async function reconcile(db: SupabaseClient) {
  const users = await listFixtureUsers(db)
  for (const user of users) await removeFixtureUser(db, user)

  const { data: staleContent, error: contentReadError } = await db
    .from('content_items').select('id').like('slug', 'pawpaw-test-%')
  if (contentReadError) throw contentReadError
  const contentIds = (staleContent ?? []).map(row => row.id as string)
  if (contentIds.length) {
    const { error } = await db.from('content_items').delete().in('id', contentIds)
    if (error) throw error
  }

  const { data: staleMedia, error: mediaReadError } = await db
    .from('media_assets').select('id, storage_path').like('storage_path', '%/pawpaw-test-%')
  if (mediaReadError) throw mediaReadError
  const mediaIds = (staleMedia ?? []).map(row => row.id as string)
  if (mediaIds.length) {
    const { error: associationError } = await db.from('content_media').delete().in('media_id', mediaIds)
    if (associationError) throw associationError
    const paths = (staleMedia ?? []).map(row => row.storage_path as string)
    if (paths.length) {
      const { error } = await db.storage.from('media').remove(paths)
      if (error) throw error
    }
    const { error } = await db.from('media_assets').delete().in('id', mediaIds)
    if (error) throw error
  }

  const { error: throttleError } = await db.from('viewer_login_attempts')
    .delete().like('key_hash', '7061777061777465%')
  if (throttleError) throw throttleError
}

export default async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('test-project')) return
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const pre = await countFixtures(db)
  console.log(`PAWPAW_FIXTURES_PRE=${JSON.stringify(pre)}`)
  await reconcile(db)

  return async () => {
    await reconcile(db)
    const post = await countFixtures(db)
    console.log(`PAWPAW_FIXTURES_POST=${JSON.stringify(post)}`)
    if (Object.values(post).some(value => value !== 0)) {
      throw new Error(`Pawpaw test fixture cleanup incomplete: ${JSON.stringify(post)}`)
    }
  }
}
