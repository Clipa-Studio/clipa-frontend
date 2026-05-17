import { getPublishedPostSummaries } from '../../../lib/publicContent'
import type { BlogCategorySlug } from '../../../lib/blogCategories'
import BlogListClient from '../BlogListClient'

interface BlogCategoryPageProps {
  categorySlug: BlogCategorySlug
}

export default async function BlogCategoryPage({ categorySlug }: BlogCategoryPageProps) {
  const posts = await getPublishedPostSummaries()

  return <BlogListClient initialPosts={posts} categorySlug={categorySlug} />
}
