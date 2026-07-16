// Extracts a representative colour palette from an image buffer using sharp.
// Returns up to 5 hex colour strings.
// Falls back to a designed default palette if sharp is unavailable or fails.

const FALLBACK_PALETTE = ['#f4c2c2', '#c3b1e1', '#b5d5e8', '#f9e4b7', '#d5f0c1']

export async function extractPalette(buffer: Buffer): Promise<string[]> {
  try {
    const sharp = (await import('sharp')).default

    // Resize to a tiny thumbnail to make statistics fast and representative.
    const { data, info } = await sharp(buffer)
      .resize(50, 50, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels: { r: number; g: number; b: number }[] = []
    for (let i = 0; i < data.length; i += info.channels) {
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
    }

    // Sample every Nth pixel to get 5 representative colours.
    const step    = Math.max(1, Math.floor(pixels.length / 5))
    const sampled = [0, 1, 2, 3, 4].map(i => pixels[Math.min(i * step, pixels.length - 1)])

    return sampled.map(({ r, g, b }) =>
      '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''),
    )
  } catch {
    return FALLBACK_PALETTE
  }
}

export { FALLBACK_PALETTE }
