export const AMBIENT_CONTRACT = {
  surfaceLightness: { min: 0.92, max: 0.95 },
  surfaceChromaMax: 0.06,
  accentLightness: { min: 0.52, max: 0.64 },
  accentChromaMax: 0.14,
  surfaceAlpha: 0.20,
  accentAlpha: 0.15,
  fallbackSurface: '#FCEAED',
  fallbackAccent: '#E8526A',
} as const

interface Oklch {
  lightness: number
  chroma: number
  hue: number
}

export interface AmbientLayer extends Oklch {
  alpha: number
  css: string
}

export interface AmbientTheme {
  source: string | null
  surface: AmbientLayer
  accent: AmbientLayer
  isFallback: boolean
  inkContrast: number
  secondaryInkContrast: number
}

const HEX = /^#[0-9a-f]{6}$/i
const CANVAS = '#FFF8EE'
const INK = '#2A1F14'
const SECONDARY_INK = '#5C4E3D'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, places = 4): number {
  return Number(value.toFixed(places))
}

function parseHex(value: string): [number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  ]
}

function toLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function toEncoded(channel: number): number {
  const bounded = clamp(channel, 0, 1)
  return bounded <= 0.0031308
    ? bounded * 12.92
    : 1.055 * bounded ** (1 / 2.4) - 0.055
}

export function hexToOklch(value: string): Oklch | null {
  if (!HEX.test(value)) return null

  const [red, green, blue] = parseHex(value).map(toLinear)
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const chroma = Math.hypot(a, b)
  const hue = chroma < 0.0001 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360

  return { lightness, chroma, hue }
}

function oklchToSrgb({ lightness, chroma, hue }: Oklch): [number, number, number] {
  const radians = hue * Math.PI / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  return [
    toEncoded(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toEncoded(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toEncoded(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [red, green, blue] = rgb.map(toLinear)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: [number, number, number], second: [number, number, number]): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
}

function composite(
  foreground: [number, number, number],
  background: [number, number, number],
  alpha: number,
): [number, number, number] {
  return foreground.map((channel, index) => (
    channel * alpha + background[index] * (1 - alpha)
  )) as [number, number, number]
}

function layer(lightness: number, chroma: number, hue: number, alpha: number): AmbientLayer {
  const normalized = {
    lightness: round(lightness),
    chroma: round(chroma),
    hue: round(hue, 2),
    alpha,
  }
  return {
    ...normalized,
    css: `oklch(${normalized.lightness} ${normalized.chroma} ${normalized.hue} / ${alpha})`,
  }
}

function themeFromSource(source: string, colour: Oklch): AmbientTheme {
  const surface = layer(
    clamp(colour.lightness, AMBIENT_CONTRACT.surfaceLightness.min, AMBIENT_CONTRACT.surfaceLightness.max),
    Math.min(colour.chroma, AMBIENT_CONTRACT.surfaceChromaMax),
    colour.hue,
    AMBIENT_CONTRACT.surfaceAlpha,
  )
  const accent = layer(
    clamp(colour.lightness, AMBIENT_CONTRACT.accentLightness.min, AMBIENT_CONTRACT.accentLightness.max),
    Math.min(colour.chroma, AMBIENT_CONTRACT.accentChromaMax),
    colour.hue,
    AMBIENT_CONTRACT.accentAlpha,
  )
  const finalSurface = composite(
    oklchToSrgb(surface),
    parseHex(CANVAS),
    surface.alpha,
  )
  const inkContrast = contrastRatio(parseHex(INK), finalSurface)
  const secondaryInkContrast = contrastRatio(parseHex(SECONDARY_INK), finalSurface)

  return {
    source,
    surface,
    accent,
    isFallback: false,
    inkContrast: round(inkContrast, 2),
    secondaryInkContrast: round(secondaryInkContrast, 2),
  }
}

function fallbackTheme(): AmbientTheme {
  const fallback = hexToOklch(AMBIENT_CONTRACT.fallbackSurface)!
  const accentSource = hexToOklch(AMBIENT_CONTRACT.fallbackAccent)!
  const surface = layer(
    clamp(fallback.lightness, AMBIENT_CONTRACT.surfaceLightness.min, AMBIENT_CONTRACT.surfaceLightness.max),
    Math.min(fallback.chroma, AMBIENT_CONTRACT.surfaceChromaMax),
    fallback.hue,
    AMBIENT_CONTRACT.surfaceAlpha,
  )
  const accent = layer(
    clamp(accentSource.lightness, AMBIENT_CONTRACT.accentLightness.min, AMBIENT_CONTRACT.accentLightness.max),
    Math.min(accentSource.chroma, AMBIENT_CONTRACT.accentChromaMax),
    accentSource.hue,
    AMBIENT_CONTRACT.accentAlpha,
  )
  const finalSurface = composite(oklchToSrgb(surface), parseHex(CANVAS), surface.alpha)

  return {
    source: null,
    surface,
    accent,
    isFallback: true,
    inkContrast: round(contrastRatio(parseHex(INK), finalSurface), 2),
    secondaryInkContrast: round(contrastRatio(parseHex(SECONDARY_INK), finalSurface), 2),
  }
}

export function createAmbientTheme(palette: string[] | null): AmbientTheme {
  const candidates = Array.isArray(palette)
    ? palette.slice(0, 5).flatMap(value => {
        if (typeof value !== 'string') return []
        const colour = hexToOklch(value)
        return colour ? [{ source: value.toUpperCase(), colour }] : []
      })
    : []

  const selected = candidates.find(({ colour }) => (
    colour.lightness >= 0.20
      && colour.lightness <= 0.90
      && colour.chroma >= 0.025
      && colour.chroma <= 0.24
  )) ?? candidates[0]

  if (!selected) return fallbackTheme()

  const theme = themeFromSource(selected.source, selected.colour)
  if (theme.inkContrast < 4.5 || theme.secondaryInkContrast < 4.5) {
    return fallbackTheme()
  }
  return theme
}
