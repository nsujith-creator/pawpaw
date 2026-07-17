import type { SupabaseClient, User } from '@supabase/supabase-js'

export const FIXTURE_OBJECT_PREFIX = 'pawpaw-test-'
export const FIXTURE_THROTTLE_PREFIX = '7061777061777465'
const LIST_LIMIT = 100
const MAX_FOLDER_OBJECTS = 5000
const NEW_EMAIL = /^pawpaw-test-[a-z0-9-]+@example\.invalid$/
const LEGACY_EMAIL = /^it-(?:du-(?:admin|nonadmin)|mm-(?:admin|nonadmin)|editor|admin|nonadmin)-\d+@example\.com$/

export interface FixtureResidue {
  users: number
  content: number
  media: number
  associations: number
  objects: number
  throttle: number
}

interface CountResult<T> {
  data: T[] | null
  count: number | null
  error: unknown | null
}

export function isPawpawFixtureUser(user: User): boolean {
  const email = user.email ?? ''
  const metadata = user.user_metadata ?? {}
  const tagged = NEW_EMAIL.test(email) && metadata.pawpaw_test_fixture === true &&
    metadata.repository === 'pawpaw'
  return tagged || LEGACY_EMAIL.test(email)
}

export function requireCountedRows<T>(label: string, result: CountResult<T>): T[] {
  if (result.error) throw new Error(`${label} residue query failed`, { cause: result.error })
  if (result.count === null || result.data === null) {
    throw new Error(`${label} residue query returned no exact count`)
  }
  if (result.count !== result.data.length) {
    throw new Error(`${label} residue query returned an inconsistent count`)
  }
  return result.data
}

async function listFixtureUsers(db: SupabaseClient): Promise<User[]> {
  const fixtures: User[] = []
  for (let page = 1; ;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error('Auth fixture listing failed', { cause: error })
    fixtures.push(...data.users.filter(isPawpawFixtureUser))
    if (data.nextPage === null) return fixtures
    page = data.nextPage
  }
}

async function listFolderPaths(
  db: SupabaseClient,
  ownerId: string,
  fixtureOnly: boolean,
): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; offset < MAX_FOLDER_OBJECTS; offset += LIST_LIMIT) {
    const { data, error } = await db.storage.from('media').list(ownerId, {
      limit: LIST_LIMIT, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`Storage fixture listing failed for owner ${ownerId}`, { cause: error })
    const objects = data ?? []
    for (const object of objects) {
      if (!fixtureOnly || object.name.startsWith(FIXTURE_OBJECT_PREFIX)) {
        paths.push(`${ownerId}/${object.name}`)
      }
    }
    if (objects.length < LIST_LIMIT) return paths
  }
  throw new Error(`Storage fixture listing exceeded ${MAX_FOLDER_OBJECTS} objects for one owner`)
}

export async function listPrefixedFixtureObjectPaths(
  db: SupabaseClient,
  ownerIds: Iterable<string>,
): Promise<string[]> {
  const paths: string[] = []
  for (const ownerId of new Set(ownerIds)) {
    paths.push(...await listFolderPaths(db, ownerId, true))
  }
  return paths
}

export async function deleteRowsByIds(
  db: SupabaseClient,
  table: 'content_items' | 'media_assets' | 'content_media',
  column: 'id' | 'content_id' | 'media_id',
  ids: string[],
  label: string,
): Promise<void> {
  if (ids.length === 0) return
  const { error } = await db.from(table).delete().in(column, ids)
  if (error) throw new Error(`${label} cleanup failed`, { cause: error })
}

export async function removeStoragePaths(db: SupabaseClient, paths: string[]): Promise<void> {
  for (let start = 0; start < paths.length; start += LIST_LIMIT) {
    const { error } = await db.storage.from('media').remove(paths.slice(start, start + LIST_LIMIT))
    if (error) throw new Error('Storage fixture cleanup failed', { cause: error })
  }
}

async function removeFixtureUser(db: SupabaseClient, user: User): Promise<void> {
  const { data: media, error: mediaReadError } = await db
    .from('media_assets').select('id').eq('created_by', user.id)
  if (mediaReadError) throw new Error('Fixture-user media lookup failed', { cause: mediaReadError })
  const mediaIds = (media ?? []).map(row => row.id as string)
  await deleteRowsByIds(db, 'content_media', 'media_id', mediaIds, 'Fixture-user association')

  const { error: contentError } = await db.from('content_items').delete().eq('created_by', user.id)
  if (contentError) throw new Error('Fixture-user content cleanup failed', { cause: contentError })
  const { error: mediaError } = await db.from('media_assets').delete().eq('created_by', user.id)
  if (mediaError) throw new Error('Fixture-user media cleanup failed', { cause: mediaError })

  await removeStoragePaths(db, await listFolderPaths(db, user.id, false))
  const { error: allowlistError } = await db.from('admin_users').delete().eq('user_id', user.id)
  if (allowlistError) throw new Error('Fixture-user allowlist cleanup failed', { cause: allowlistError })
  const { error: authError } = await db.auth.admin.deleteUser(user.id)
  if (authError) throw new Error('Fixture Auth-user cleanup failed', { cause: authError })
}

async function fixtureRows(db: SupabaseClient) {
  const contentResult = await db.from('content_items')
    .select('id', { count: 'exact' }).like('slug', `${FIXTURE_OBJECT_PREFIX}%`)
  const content = requireCountedRows('Content', contentResult)

  const mediaResult = await db.from('media_assets')
    .select('id, storage_path', { count: 'exact' }).like('storage_path', `%/${FIXTURE_OBJECT_PREFIX}%`)
  const media = requireCountedRows('Media', mediaResult)

  const throttleResult = await db.from('viewer_login_attempts')
    .select('key_hash', { count: 'exact' }).like('key_hash', `${FIXTURE_THROTTLE_PREFIX}%`)
  const throttle = requireCountedRows('Throttle', throttleResult)

  return { content, media, throttle }
}

async function fixtureAssociations(
  db: SupabaseClient,
  contentIds: string[],
  mediaIds: string[],
): Promise<{ content_id: string; media_id: string }[]> {
  const rows = new Map<string, { content_id: string; media_id: string }>()
  for (const [column, ids] of [['content_id', contentIds], ['media_id', mediaIds]] as const) {
    if (ids.length === 0) continue
    const { data, error } = await db.from('content_media').select('content_id, media_id').in(column, ids)
    if (error) throw new Error('Association residue query failed', { cause: error })
    for (const row of data ?? []) rows.set(`${row.content_id}:${row.media_id}`, row)
  }
  return [...rows.values()]
}

async function fixtureOwnerIds(
  db: SupabaseClient,
  users: User[],
  mediaPaths: string[],
): Promise<string[]> {
  const { data: admins, error: adminError } = await db.from('admin_users').select('user_id')
  if (adminError) throw new Error('Admin owner lookup failed', { cause: adminError })
  const { data: homes, error: homeError } = await db.from('content_items')
    .select('created_by').eq('type', 'home').eq('slug', 'home')
  if (homeError) throw new Error('Home owner lookup failed', { cause: homeError })
  return [...new Set([
    ...users.map(user => user.id),
    ...(admins ?? []).map(row => row.user_id as string),
    ...(homes ?? []).map(row => row.created_by as string),
    ...mediaPaths.map(path => path.split('/')[0]),
  ])]
}

export async function countPawpawFixtureResidue(db: SupabaseClient): Promise<FixtureResidue> {
  const users = await listFixtureUsers(db)
  const rows = await fixtureRows(db)
  const contentIds = rows.content.map(row => row.id as string)
  const mediaIds = rows.media.map(row => row.id as string)
  const associations = await fixtureAssociations(db, contentIds, mediaIds)
  const ownerIds = await fixtureOwnerIds(
    db,
    users,
    rows.media.map(row => row.storage_path as string),
  )
  const objects = await listPrefixedFixtureObjectPaths(db, ownerIds)
  return {
    users: users.length,
    content: rows.content.length,
    media: rows.media.length,
    associations: associations.length,
    objects: objects.length,
    throttle: rows.throttle.length,
  }
}

export function assertZeroFixtureResidue(residue: FixtureResidue): void {
  if (Object.values(residue).some(value => value !== 0)) {
    throw new Error(`Pawpaw test fixture cleanup incomplete: ${JSON.stringify(residue)}`)
  }
}

export async function reconcilePawpawFixtures(db: SupabaseClient): Promise<void> {
  const users = await listFixtureUsers(db)
  for (const user of users) await removeFixtureUser(db, user)

  const rows = await fixtureRows(db)
  const contentIds = rows.content.map(row => row.id as string)
  const mediaIds = rows.media.map(row => row.id as string)
  const associations = await fixtureAssociations(db, contentIds, mediaIds)
  await deleteRowsByIds(
    db, 'content_media', 'media_id', [...new Set(associations.map(row => row.media_id))],
    'Fixture association',
  )
  await deleteRowsByIds(
    db, 'content_media', 'content_id', [...new Set(associations.map(row => row.content_id))],
    'Fixture association',
  )
  await deleteRowsByIds(db, 'content_items', 'id', contentIds, 'Fixture content')
  await deleteRowsByIds(db, 'media_assets', 'id', mediaIds, 'Fixture media')

  const ownerIds = await fixtureOwnerIds(
    db,
    [],
    rows.media.map(row => row.storage_path as string),
  )
  await removeStoragePaths(db, await listPrefixedFixtureObjectPaths(db, ownerIds))

  const { error: throttleError } = await db.from('viewer_login_attempts')
    .delete().like('key_hash', `${FIXTURE_THROTTLE_PREFIX}%`)
  if (throttleError) throw new Error('Throttle fixture cleanup failed', { cause: throttleError })
}
