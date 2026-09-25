import type { Metadata } from 'next'
import { Baloo_Chettan_2, Bricolage_Grotesque, Literata } from 'next/font/google'
import './globals.css'

// Names, titles and interface: a friendly grotesk that looks drawn rather than corporate.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
  fallback: ['system-ui', 'Arial'],
})

// Reading: a serif built for long text on screens.
const literata = Literata({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-reading',
  fallback: ['Georgia', 'Times New Roman'],
})

// Malayalam: rounded, the shape of her names.
const balooChettan = Baloo_Chettan_2({
  subsets: ['malayalam', 'latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-malayalam',
  fallback: ['system-ui', 'Arial'],
})

export const metadata: Metadata = {
  title:  { default: 'pawpaw', template: '%s · pawpaw' },
  description: "Varada's family pages.",
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${literata.variable} ${balooChettan.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
