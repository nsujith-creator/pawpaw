'use client'
// Uploads photos one after another: shrink in the browser, get a one-time upload pass,
// send the bytes straight to private storage, then have the server check and register them.
// One photo failing never stops the rest.

import { authorizeUpload, finalizeUpload } from '@/app/admin/media/actions'
import { createClient } from '@/lib/supabase/client'
import { preparePhoto } from '@/lib/media/prepare-photo'

export interface UploadOutcome {
  name: string
  mediaId?: string
  error?: string
}

export async function uploadPhotos(
  files: File[],
  options: { contentId: string | null; altText: string; onProgress?: (done: number, total: number) => void },
): Promise<UploadOutcome[]> {
  const supabase = createClient()
  const outcomes: UploadOutcome[] = []
  for (const [index, file] of files.entries()) {
    options.onProgress?.(index, files.length)
    try {
      const prepared = await preparePhoto(file)
      if (!prepared.ok) { outcomes.push({ name: file.name, error: prepared.error }); continue }

      const pass = new FormData()
      pass.set('file_type', prepared.type)
      pass.set('file_size', String(prepared.file.size))
      const auth = await authorizeUpload(pass)
      if (!('ok' in auth) || !auth.path || !auth.token) {
        outcomes.push({ name: file.name, error: ('error' in auth && auth.error) || "Couldn't start the upload." })
        continue
      }

      const sent = await supabase.storage.from('media').uploadToSignedUrl(auth.path, auth.token, prepared.file, { contentType: prepared.type })
      if (sent.error) { outcomes.push({ name: file.name, error: "The upload didn't finish. Check the connection and try again." }); continue }

      const finish = new FormData()
      finish.set('path', auth.path)
      finish.set('alt_text', options.altText)
      finish.set('caption', '')
      if (options.contentId) finish.set('content_id', options.contentId)
      const result = await finalizeUpload(finish)
      if ('error' in result && result.error) outcomes.push({ name: file.name, error: result.error })
      else if ('mediaId' in result) outcomes.push({ name: file.name, mediaId: result.mediaId })
    } catch {
      outcomes.push({ name: file.name, error: "The upload didn't finish. You may have been signed out; reload and try again." })
    }
  }
  options.onProgress?.(files.length, files.length)
  return outcomes
}
