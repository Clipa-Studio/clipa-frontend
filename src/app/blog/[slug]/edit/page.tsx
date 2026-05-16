import { redirect } from 'next/navigation'

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/admin/blog/${slug}/edit`)
}
