// Application-level upload validation, shared by the Server Action (final
// authority) and the client form (fast pre-check before sending 8 MB over the
// wire). Pure module — safe to import from client components.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8 MB application limit

export const ALLOWED_UPLOAD_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

// Returns a user-facing error message, or null when the file is acceptable.
export function validateUploadFile(file: { size: number; type: string } | null): string | null {
  if (!file || file.size === 0) return 'No file selected.'
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) return 'Unsupported file type. Use JPEG, PNG, or WebP.'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File exceeds 8 MB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`
  }
  return null
}
