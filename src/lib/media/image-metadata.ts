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
