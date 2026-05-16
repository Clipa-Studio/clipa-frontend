import { redirect } from 'next/navigation'

export default async function EditReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/admin/changelog/${slug}/edit`)
}
