// Extracts width, height, and format from an uploaded image buffer using sharp.

export interface ImageMetadata {
  width: number | null
  height: number | null
  format: string | null
}

export interface VerifiedImageMetadata {
  width: number
  height: number
  format: string
}

export interface ImageVerifierDiagnostic {
  name: string
  code: string | null
  message: string
}

export type ImageVerificationResult =
  | { kind: 'verified'; metadata: VerifiedImageMetadata }
  | { kind: 'invalid' }
  | { kind: 'unavailable'; diagnostic: ImageVerifierDiagnostic }

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const loadSharp = async () => (await import('sharp')).default

function diagnosticFor(error: unknown): ImageVerifierDiagnostic {
  const candidate = error instanceof Error ? error : new Error(String(error))
  const code = typeof (candidate as { code?: unknown }).code === 'string'
    ? (candidate as { code: string }).code
    : null

  return {
    name: candidate.name || 'Error',
    code,
    message: candidate.message.slice(0, 240),
  }
}

export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const sharp = await loadSharp()
    const meta = await sharp(buffer).metadata()
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
      format: meta.format ?? null,
    }
  } catch {
    // Palette extraction is optional; callers use this neutral fallback.
    return { width: null, height: null, format: null }
  }
}

// Metadata alone can be read from a truncated header. Force a one-pixel decode
// so malformed/truncated bytes cannot be registered as an image.
//
// A decoder/runtime failure is deliberately distinct from an invalid image. The
// finalizer must retain a private upload when verification infrastructure cannot
// complete, rather than deleting a potentially valid family photograph.
export async function verifyImageBytes(
  buffer: Buffer,
  declaredMime: string,
): Promise<ImageVerificationResult> {
  let sharp: Awaited<ReturnType<typeof loadSharp>>
  try {
    sharp = await loadSharp()
  } catch (error) {
    return { kind: 'unavailable', diagnostic: diagnosticFor(error) }
  }

  try {
    const image = sharp(buffer, { failOn: 'error' })
    const meta = await image.metadata()
    if (!meta.format || FORMAT_MIME[meta.format] !== declaredMime || !meta.width || !meta.height) {
      return { kind: 'invalid' }
    }

    await image.clone().resize(1, 1, { fit: 'inside' }).raw().toBuffer()

    return {
      kind: 'verified',
      metadata: { width: meta.width, height: meta.height, format: meta.format },
    }
  } catch (error) {
    return { kind: 'unavailable', diagnostic: diagnosticFor(error) }
  }
}
