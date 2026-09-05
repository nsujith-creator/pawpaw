import JourneyState from '@/components/journey/journey-state'

export default function Loading() {
  return <JourneyState eyebrow="Just a moment" title="Finding the next page…" message="The story is on its way. Nothing has wandered off." scene="explorer" loading />
}
