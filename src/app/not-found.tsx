import StatePage from '@/components/family/state-page'

export default function NotFound() {
  return <StatePage colour="sky" title="Nothing here." body="The link may be old, or the story isn't up yet." action={{ href: '/', label: 'Home' }} secondary={{ href: '/chapters', label: 'Her stories' }} />
}
