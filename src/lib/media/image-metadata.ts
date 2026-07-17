// Extracts width, height, and format from an uploaded image buffer using sharp.
// Falls back to null values if sharp is unavailable (Vercel runtime check pending).

export interface ImageMetadata {
  width:  number | null
  height: number | null
  format: string | null
}

export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const sharp = (await import('sharp')).default
    const meta  = await sharp(buffer).metadata()
    return {
      width:  meta.width  ?? null,
      height: meta.height ?? null,
      format: meta.format ?? null,
    }
  } catch {
    // sharp not available or unsupported on this runtime — caller uses null fallback
    return { width: null, height: null, format: null }
  }
}

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

// Metadata alone can be read from a truncated header. Force a one-pixel decode
// so malformed/truncated bytes cannot be registered as an image.
export async function verifyImageBytes(
  buffer: Buffer,
  declaredMime: string,
): Promise<ImageMetadata | null> {
  try {
    const sharp = (await import('sharp')).default
    const image = sharp(buffer, { failOn: 'error' })
    const meta = await image.metadata()
    if (!meta.format || FORMAT_MIME[meta.format] !== declaredMime || !meta.width || !meta.height) {
      return null
    }
    await image.clone().resize(1, 1, { fit: 'inside' }).raw().toBuffer()
    return { width: meta.width, height: meta.height, format: meta.format }
  } catch {
    return null
  }
}
