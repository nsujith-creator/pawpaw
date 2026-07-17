import { createClient } from '@supabase/supabase-js'
import {
  assertZeroFixtureResidue,
  countPawpawFixtureResidue,
  reconcilePawpawFixtures,
} from '../support/fixture-cleanup'

export default async function setup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('test-project')) return
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const pre = await countPawpawFixtureResidue(db)
  console.log(`PAWPAW_FIXTURES_PRE=${JSON.stringify(pre)}`)
  await reconcilePawpawFixtures(db)
  assertZeroFixtureResidue(await countPawpawFixtureResidue(db))

  return async () => {
    await reconcilePawpawFixtures(db)
    const post = await countPawpawFixtureResidue(db)
    console.log(`PAWPAW_FIXTURES_POST=${JSON.stringify(post)}`)
    assertZeroFixtureResidue(post)
  }
}
