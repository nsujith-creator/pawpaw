'use client'

import StatePage from '@/components/family/state-page'

export default function ArchiveError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatePage colour="rose" title="This page didn't load." body="Something went wrong on our side. Nothing is lost. Try again, or go back Home." onRetry={reset} action={{ href: '/', label: 'Home' }} />
}
