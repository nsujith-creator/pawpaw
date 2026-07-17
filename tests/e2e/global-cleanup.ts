import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './viewer-session'
import {
  assertZeroFixtureResidue,
  countPawpawFixtureResidue,
  reconcilePawpawFixtures,
} from '../support/fixture-cleanup'

export default async function setup() {
  const localEnv = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing E2E cleanup configuration')

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const pre = await countPawpawFixtureResidue(db)
  console.log(`PAWPAW_E2E_FIXTURES_PRE=${JSON.stringify(pre)}`)
  await reconcilePawpawFixtures(db)
  assertZeroFixtureResidue(await countPawpawFixtureResidue(db))

  return async () => {
    await reconcilePawpawFixtures(db)
    const post = await countPawpawFixtureResidue(db)
    console.log(`PAWPAW_E2E_FIXTURES_POST=${JSON.stringify(post)}`)
    assertZeroFixtureResidue(post)
  }
}
