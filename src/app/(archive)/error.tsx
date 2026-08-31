'use client'

import JourneyState from '@/components/journey/journey-state'

export default function ArchiveError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <JourneyState eyebrow="A small wobble" title="This page needs one more try." message="Nothing has been changed or lost. We can fetch the memory again, or wander back Home." scene="gardener" onRetry={reset} primaryHref="/" primaryLabel="Go Home" />
}
