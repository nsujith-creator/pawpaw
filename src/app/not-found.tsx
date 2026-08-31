import JourneyState from '@/components/journey/journey-state'

export default function NotFound() {
  return <JourneyState eyebrow="A tiny wrong turn" title="This page is playing hide-and-seek." message="The link may be old, or the memory may still be getting ready. Let’s head somewhere familiar." scene="explorer" primaryHref="/" primaryLabel="Go Home" secondaryHref="/chapters" secondaryLabel="Browse Chapters" />
}
