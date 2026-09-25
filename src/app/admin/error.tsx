'use client'

import StatePage from '@/components/family/state-page'

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatePage colour="rose" title="That page broke." body="Nothing went up on her page and nothing was deleted. Words you were typing are kept in this browser; open the story again to bring them back." onRetry={reset} action={{ href: '/admin', label: 'Her stories' }} />
}
