import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '../..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const stream = read('src/lib/video/cloudflare.ts')
const actions = read('src/app/admin/content/video-actions.ts')
const uploader = read('src/app/admin/content/story-videos.tsx')
const player = read('src/components/family/family-video.tsx')
const playRoute = read('src/app/v/[token]/route.ts')
const migration = read('supabase/migrations/20260814210307_private_family_videos.sql')

describe('private family video', () => {
  it('uses a direct resumable upload without exposing the Cloudflare API token', () => {
    expect(stream).toContain('direct_user=true')
    expect(stream).toContain("'Tus-Resumable': '1.0.0'")
    expect(stream).toContain('new URL(uploadUrl).pathname')
    expect(stream).toContain("cloudflareUid.split('?')[0]")
    expect(actions).not.toContain('CLOUDFLARE_STREAM_API_TOKEN')
  })

  it('lets an administrator refresh processing and remove an unpublished private video', () => {
    expect(actions).toContain('deleteAttachedVideo')
    expect(stream).toContain('response.status !== 404')
    expect(actions).toContain('Array.isArray(row.video_assets)')
    expect(actions).toContain('content_revision_videos')
    expect(uploader).toContain('Check again')
    expect(uploader).toContain('deleteAttachedVideo')
  })

  it('requires signed URLs, disables downloads, and makes the playback link only when play is pressed', () => {
    expect(stream).toContain("'requiresignedurls'")
    expect(stream).toContain('downloadable: false')
    expect(stream).toContain('lifetimeSeconds = 4 * 60 * 60')
    expect(player).toContain("fetch(`/v/${playToken}`, { method: 'POST'")
    expect(playRoute).toContain("startsWith('video:')")
    expect(stream).toContain('thumbnail')
    expect(stream).not.toContain('/embed')
  })

  it('snapshots videos on publication and forbids later revision edits', () => {
    expect(migration).toContain('content_revision_videos')
    expect(migration).toContain('snapshot_revision_videos')
    expect(migration).toContain('VIDEO_REVISION_IMMUTABLE')
  })

  it('does not grant browser database access to private video tables or autoplay family playback', () => {
    expect(migration).toContain('from anon, authenticated')
    expect(player).not.toContain('autoPlay')
    // The player frame exists only after someone presses play.
    expect(player).toContain("state === 'playing' && url ? (")
  })
})
