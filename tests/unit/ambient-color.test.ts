import { describe, expect, it } from 'vitest'
import {
  AMBIENT_CONTRACT,
  createAmbientTheme,
  hexToOklch,
} from '@/lib/media/ambient-color'

describe('Home ambient colour contract', () => {
  it('records every approved numeric bound exactly', () => {
    expect(AMBIENT_CONTRACT).toEqual({
      surfaceLightness: { min: 0.92, max: 0.95 },
      surfaceChromaMax: 0.06,
      accentLightness: { min: 0.52, max: 0.64 },
      accentChromaMax: 0.14,
      surfaceAlpha: 0.20,
      accentAlpha: 0.15,
      fallbackSurface: '#FCEAED',
      fallbackAccent: '#E8526A',
    })
  })

  it('rejects non-hex values and accepts exact six-digit sRGB hex', () => {
    expect(hexToOklch('rose')).toBeNull()
    expect(hexToOklch('#fff')).toBeNull()
    expect(hexToOklch('#12345g')).toBeNull()
    expect(hexToOklch('#E8526A')).not.toBeNull()
  })

  it('selects the first useful stored swatch without reordering the palette', () => {
    const theme = createAmbientTheme(['invalid', '#808080', '#E8526A', '#4590CC'])
    expect(theme.source).toBe('#E8526A')
    expect(theme.isFallback).toBe(false)
  })

  it('uses the first valid swatch when none meets the preferred source range', () => {
    const theme = createAmbientTheme(['#FFFFFF', '#000000'])
    expect(theme.source).toBe('#FFFFFF')
    expect(theme.isFallback).toBe(false)
  })

  it('clamps dark saturated inputs to every lower lightness and upper chroma bound', () => {
    const theme = createAmbientTheme(['#0000FF'])
    expect(theme.surface.lightness).toBe(AMBIENT_CONTRACT.surfaceLightness.min)
    expect(theme.surface.chroma).toBe(AMBIENT_CONTRACT.surfaceChromaMax)
    expect(theme.accent.lightness).toBe(AMBIENT_CONTRACT.accentLightness.min)
    expect(theme.accent.chroma).toBe(AMBIENT_CONTRACT.accentChromaMax)
  })

  it('clamps bright neutral inputs to the upper lightness bounds without inventing chroma', () => {
    const theme = createAmbientTheme(['#FFFFFF'])
    expect(theme.surface.lightness).toBe(AMBIENT_CONTRACT.surfaceLightness.max)
    expect(theme.surface.chroma).toBe(0)
    expect(theme.accent.lightness).toBe(AMBIENT_CONTRACT.accentLightness.max)
    expect(theme.accent.chroma).toBe(0)
  })

  it('applies the approved alpha bounds in the emitted CSS colours', () => {
    const theme = createAmbientTheme(['#E8526A'])
    expect(theme.surface.alpha).toBe(0.20)
    expect(theme.accent.alpha).toBe(0.15)
    expect(theme.surface.css).toContain('/ 0.2)')
    expect(theme.accent.css).toContain('/ 0.15)')
  })

  it.each([null, [], [''], ['transparent'], ['#12345g']])(
    'uses the approved Home soft fallback for invalid input %#',
    palette => {
      const theme = createAmbientTheme(palette)
      expect(theme.isFallback).toBe(true)
      expect(theme.source).toBeNull()
      expect(theme.surface.lightness).toBeGreaterThanOrEqual(0.92)
      expect(theme.surface.lightness).toBeLessThanOrEqual(0.95)
      expect(theme.surface.chroma).toBeLessThanOrEqual(0.06)
    },
  )

  it('keeps approved ink and secondary ink above WCAG AA after compositing', () => {
    for (let hue = 0; hue < 360; hue += 15) {
      const red = Math.round((Math.cos(hue * Math.PI / 180) + 1) * 127.5)
      const green = Math.round((Math.cos((hue + 120) * Math.PI / 180) + 1) * 127.5)
      const blue = Math.round((Math.cos((hue + 240) * Math.PI / 180) + 1) * 127.5)
      const source = `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`
      const theme = createAmbientTheme([source])
      expect(theme.inkContrast).toBeGreaterThanOrEqual(4.5)
      expect(theme.secondaryInkContrast).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('is deterministic for the same stored palette', () => {
    const palette = ['#359575', '#4590CC', '#E8526A']
    expect(createAmbientTheme(palette)).toEqual(createAmbientTheme(palette))
  })
})
