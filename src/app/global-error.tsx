'use client'

import StatePage from '@/components/family/state-page'
import './globals.css'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <StatePage colour="rose" title="Something broke." body="It's on our side, and nothing is lost. Try again in a minute." onRetry={reset} action={{ href: '/', label: 'Home' }} />
      </body>
    </html>
  )
}
