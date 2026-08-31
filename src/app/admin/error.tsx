'use client'

import JourneyState from '@/components/journey/journey-state'

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <JourneyState eyebrow="Author’s studio" title="That didn’t save the way it should." message="Your page has not been published or deleted. Try the action again; if it still misbehaves, return to the studio." scene="artist" onRetry={reset} primaryHref="/admin" primaryLabel="Studio dashboard" />
}
