import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pawpaw',
    short_name: 'Pawpaw',
    description: 'A private family archive.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFC93C',
    theme_color: '#FFC93C',
    icons: [
      {
        src: '/icons/pawpaw-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pawpaw-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pawpaw-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
