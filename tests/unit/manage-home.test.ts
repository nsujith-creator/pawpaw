import { describe, expect, it, vi } from 'vitest'
import {
  loadCanonicalAdminHome,
  saveCanonicalHome,
  unpublishCanonicalHome,
  type HomeMutationStore,
} from '@/lib/content/manage-home'

const payload = {
  title: 'Canonical Home',
  body_blocks: [{ type: 'paragraph' as const, text: 'Body' }],
  status: 'draft' as const,
  published_at: null,
}

function store(overrides: Partial<HomeMutationStore> = {}): HomeMutationStore {
  return {
    findCanonical: vi.fn(async () => ({ rows: [{ id: 'home-id' }], error: null })),
    updateCanonical: vi.fn(async id => ({ id, error: null })),
    unpublishCanonical: vi.fn(async id => ({ id, error: null })),
    insertCanonical: vi.fn(async () => ({ id: 'new-home', error: null })),
    ...overrides,
  }
}

describe('canonical Home mutation', () => {
  it('rejects a wrong client ID without mutating another row', async () => {
    const data = store()
    const result = await saveCanonicalHome(data, 'admin-id', 'story-id', payload)
    expect(result).toHaveProperty('error')
    expect(data.updateCanonical).not.toHaveBeenCalled()
    expect(data.insertCanonical).not.toHaveBeenCalled()
  })

  it('updates only the server-resolved canonical Home', async () => {
    const data = store()
    await expect(saveCanonicalHome(data, 'admin-id', 'home-id', payload))
      .resolves.toEqual({ ok: true, id: 'home-id' })
    expect(data.updateCanonical).toHaveBeenCalledWith(
      'home-id', expect.objectContaining({ updated_by: 'admin-id' }),
    )
  })

  it('reports a zero-row update as a persistence failure', async () => {
    const data = store({ updateCanonical: vi.fn(async () => ({ id: null, error: null })) })
    const result = await saveCanonicalHome(data, 'admin-id', 'home-id', payload)
    expect(result).toEqual({ error: 'Could not save right now. Please try again in a moment.' })
  })

  it('treats duplicate canonical rows as an error instead of choosing one', async () => {
    const data = store({
      findCanonical: vi.fn(async () => ({ rows: [{ id: 'a' }, { id: 'b' }], error: null })),
    })
    expect(await saveCanonicalHome(data, 'admin-id', null, payload)).toHaveProperty('error')
  })

  it('unpublishes without sending replacement title or body content', async () => {
    const data = store()
    await expect(unpublishCanonicalHome(data, 'admin-id'))
      .resolves.toEqual({ ok: true, id: 'home-id' })
    expect(data.unpublishCanonical).toHaveBeenCalledWith('home-id', 'admin-id')
    expect(data.updateCanonical).not.toHaveBeenCalled()
  })
})

describe('admin Home loading', () => {
  it('does not convert a query failure into an empty Home', async () => {
    await expect(loadCanonicalAdminHome(async () => ({ rows: null, error: new Error('offline') })))
      .resolves.toEqual({ state: 'error' })
  })

  it('returns empty only after a successful zero-row query', async () => {
    await expect(loadCanonicalAdminHome(async () => ({ rows: [], error: null })))
      .resolves.toEqual({ state: 'empty' })
  })
})
