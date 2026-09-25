// Runs in the browser before a photo is uploaded.
// Phone photos are 3–12 MB. The family pages never show one wider than 1600 pixels, so each
// photo is resized to 2400 pixels on its long side and saved as a JPEG (usually 0.4–1 MB).
// Uploads get faster on a phone connection and 1,000 photos fit comfortably in storage.
// The photo's rotation from the camera is applied, so nothing arrives sideways.

import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from './validate-upload'

const LONG_EDGE = 2400
const QUALITY = 0.86

export type PreparedPhoto = { ok: true; file: Blob; type: string } | { ok: false; error: string }

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    bitmap = null
  }

  if (bitmap) {
    const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await canvasToBlob(canvas)
      if (blob && blob.size > 0 && blob.size <= MAX_UPLOAD_BYTES) return { ok: true, file: blob, type: 'image/jpeg' }
    }
  }

  // The browser couldn't open it (for example a HEIC photo on a desktop browser).
  // A JPEG, PNG or WebP that is already small enough still goes up as it is.
  if (ALLOWED_UPLOAD_TYPES.has(file.type) && file.size <= MAX_UPLOAD_BYTES) return { ok: true, file, type: file.type }
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return { ok: false, error: "This browser can't open HEIC photos. Add it from your phone, or export it as JPEG first." }
  }
  return { ok: false, error: "This file couldn't be opened as a photo." }
}
