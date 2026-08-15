import type { Metadata } from 'next'
import { Fraunces, Manrope, Noto_Sans_Malayalam } from 'next/font/google'
import PwaControls from '@/components/pwa/pwa-controls'
import './globals.css'

const fraunces = Fraunces({
  weight: '500',
  style: 'normal',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  fallback: ['Georgia', 'Times New Roman'],
})

const manrope = Manrope({
  weight: ['400', '600', '700'],
  style: 'normal',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  fallback: ['Arial'],
})

const notoSansMalayalam = Noto_Sans_Malayalam({
  weight: ['400', '500'],
  style: 'normal',
  subsets: ['malayalam'],
  display: 'swap',
  preload: false,
  variable: '--font-malayalam',
  fallback: ['Arial'],
})

export const metadata: Metadata = {
  title:  "Varada's World",
  description: 'A private family archive.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} ${notoSansMalayalam.variable}`}
    >
      <body>
        <PwaControls />
        {children}
      </body>
    </html>
  )
}
