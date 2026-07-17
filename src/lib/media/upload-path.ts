// Storage path authority for direct-to-Storage uploads.
// Every media object lives under exactly one admin's folder:
//   <adminUserId>/<timestamp>-<random>.<ext>
// The server builds paths (never the browser) and re-verifies ownership at
// finalization, so a client can never smuggle a path into someone else's
// folder or outside the expected shape.

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

const FILE_SEGMENT = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/

// Returns a fresh server-chosen path for this admin, or null for an
// unsupported MIME type.
export function buildUploadPath(adminId: string, mimeType: string): string | null {
  const ext = EXT_BY_TYPE[mimeType]
  if (!ext) return null
  const random = Math.random().toString(36).slice(2, 10)
  return `${adminId}/${Date.now()}-${random}.${ext}`
}

// True only when the path is exactly <adminId>/<safe-filename>.<allowed-ext>
// with no extra segments, traversal, or foreign prefixes.
export function pathBelongsTo(path: string, adminId: string): boolean {
  if (!adminId || !path.startsWith(`${adminId}/`)) return false
  const rest = path.slice(adminId.length + 1)
  return FILE_SEGMENT.test(rest)
}
