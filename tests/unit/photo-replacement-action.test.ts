import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actions = readFileSync('src/app/admin/media/actions.ts', 'utf8')
const start = actions.indexOf('export async function finalizeReplacementUpload')
const end = actions.indexOf('export async function updateMediaDetails', start)
const replacementAction = actions.slice(start, end)

describe('replacement server action contract', () => {
  it('finalizes the uploaded replacement before calling the atomic replacement core', () => {
    expect(start).toBeGreaterThan(-1)
    expect(replacementAction.indexOf('finalizeUploadCore')).toBeGreaterThan(-1)
    expect(replacementAction.indexOf('replaceAttachmentCore')).toBeGreaterThan(
      replacementAction.indexOf('finalizeUploadCore'),
    )
  })

  it('never deletes the old media record or a Storage object', () => {
    expect(replacementAction).not.toContain('deleteMediaCore')
    expect(replacementAction).not.toMatch(/\.delete\s*\(/)
    expect(replacementAction).not.toMatch(/\.remove\s*\(/)
  })

  it('keeps a finalized upload in Media Library when the atomic swap fails', () => {
    expect(replacementAction).toContain('The new file remains safely available in Media Library.')
    expect(replacementAction).toContain('mediaId: finalized.mediaId')
  })

  it('refreshes authoritative draft state only after a successful replacement', () => {
    expect(replacementAction.indexOf('await revalidateTarget(contentId)')).toBeGreaterThan(
      replacementAction.indexOf("if ('error' in replaced)"),
    )
  })
})
