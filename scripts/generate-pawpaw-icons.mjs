import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const root = process.cwd()
const sourcePath = join(root, 'src', 'app', 'icon.svg')
const outputs = [
  { path: join(root, 'src', 'app', 'apple-icon.png'), size: 180 },
  { path: join(root, 'public', 'icons', 'pawpaw-192.png'), size: 192 },
  { path: join(root, 'public', 'icons', 'pawpaw-512.png'), size: 512 },
  { path: join(root, 'public', 'icons', 'pawpaw-maskable-512.png'), size: 512 },
]
const faviconPath = join(root, 'src', 'app', 'favicon.ico')
const proofPath = join(root, 'test-results', 'pawpaw-2.0.1-icons', 'pawpaw-icon-family.png')

function createIco(entries) {
  const header = Buffer.alloc(6 + entries.length * 16)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  let offset = header.length
  entries.forEach(({ size, png }, index) => {
    const entryOffset = 6 + index * 16
    header.writeUInt8(size === 256 ? 0 : size, entryOffset)
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1)
    header.writeUInt8(0, entryOffset + 2)
    header.writeUInt8(0, entryOffset + 3)
    header.writeUInt16LE(1, entryOffset + 4)
    header.writeUInt16LE(32, entryOffset + 6)
    header.writeUInt32LE(png.length, entryOffset + 8)
    header.writeUInt32LE(offset, entryOffset + 12)
    offset += png.length
  })

  return Buffer.concat([header, ...entries.map(entry => entry.png)])
}

async function rasterize(svg, size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
}

async function createProof(svg, rasters) {
  const canvas = sharp({
    create: { width: 1600, height: 900, channels: 4, background: '#FFFFFF' },
  })
  const placements = [
    { input: await rasterize(svg, 16), left: 70, top: 135, label: '16px favicon', labelX: 70 },
    { input: await rasterize(svg, 32), left: 215, top: 127, label: '32px favicon', labelX: 205 },
    { input: rasters.get(180), left: 380, top: 55, label: '180px Apple icon', labelX: 380 },
    { input: rasters.get(192), left: 650, top: 49, label: '192px app icon', labelX: 650 },
    { input: rasters.get(512), left: 70, top: 335, label: '512px app icon', labelX: 70 },
    { input: rasters.get('maskable'), left: 720, top: 335, label: '512px maskable icon and safe area', labelX: 720 },
  ]
  const labels = placements.map(item =>
    `<text x="${item.labelX}" y="${item.top - 18}" font-family="Arial, sans-serif" font-size="22" fill="#2A1F14">${item.label}</text>`,
  ).join('')
  const guide = '<circle cx="976" cy="591" r="204.8" fill="none" stroke="#2E6D9C" stroke-width="4" stroke-dasharray="12 8"/>'
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">${labels}${guide}</svg>`)

  await mkdir(dirname(proofPath), { recursive: true })
  await canvas.composite([
    ...placements.map(({ input, left, top }) => ({ input, left, top })),
    { input: overlay, left: 0, top: 0 },
  ]).png().toFile(proofPath)
}

async function main() {
  const svg = await readFile(sourcePath)
  const rasters = new Map()

  for (const output of outputs) {
    await mkdir(dirname(output.path), { recursive: true })
    const png = await rasterize(svg, output.size)
    await writeFile(output.path, png)
    rasters.set(output.path.includes('maskable') ? 'maskable' : output.size, png)
    console.log(`${output.path} ${output.size}x${output.size}`)
  }

  const faviconEntries = await Promise.all([16, 32, 48].map(async size => ({
    size,
    png: await rasterize(svg, size),
  })))
  await writeFile(faviconPath, createIco(faviconEntries))
  console.log(`${faviconPath} 16x16, 32x32, 48x48`)

  await createProof(svg, rasters)
  console.log(`${proofPath} 1600x900 proof only`)
}

main().catch(error => {
  console.error('Pawpaw icon generation failed.')
  console.error(error)
  process.exitCode = 1
})
