'use client'

import JourneyState from '@/components/journey/journey-state'
import './globals.css'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <JourneyState eyebrow="A small wobble" title="Pawpaw tripped over its own shoelaces." message="Your memories are still safe. Try this page once more, or step back into the archive." scene="gardener" onRetry={reset} primaryHref="/" primaryLabel="Go Home" />
      </body>
    </html>
  )
}
