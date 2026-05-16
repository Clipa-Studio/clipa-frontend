import { getPublishedPosts } from '../../../lib/blog'
import type { BlogCategorySlug } from '../../../lib/blogCategories'
import BlogListClient from '../BlogListClient'

interface BlogCategoryPageProps {
  categorySlug: BlogCategorySlug
}

export default async function BlogCategoryPage({ categorySlug }: BlogCategoryPageProps) {
  const posts = await getPublishedPosts()

  return <BlogListClient initialPosts={posts} categorySlug={categorySlug} />
}

