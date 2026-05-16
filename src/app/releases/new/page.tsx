import { redirect } from 'next/navigation'

export default function NewReleasePage() {
  redirect('/admin/releases/new')
}
