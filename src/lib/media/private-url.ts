// Private photo addresses for pages.
// Returns /p/<token>, an app route that checks the family or admin session on every request
// and serves a right-sized copy. Unlike the old 5-minute signed storage links, these never
// expire while someone is reading, and they reveal nothing about where the file is stored.
// The name is kept so existing callers need no change.

import { encodeMediaToken } from './media-token'

export async function generateSignedUrl(storagePath: string): Promise<string> {
  return `/p/${encodeMediaToken(storagePath)}`
}

export { photoSrcSet } from './photo-srcset'
