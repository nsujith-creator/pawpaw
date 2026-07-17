import type { MetadataRoute } from 'next'

// Robots.txt blocks all crawlers. Authentication is the real access control.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
