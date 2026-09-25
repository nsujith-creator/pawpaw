import { redirect } from 'next/navigation'

// The story list lives at /admin now.
export default function ContentRedirect() {
  redirect('/admin')
}
