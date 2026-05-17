import type { Metadata } from 'next'
import BlogCategoryPage from '../_components/BlogCategoryPage'
import { getBlogCategory } from '../../../lib/blogCategories'

export const revalidate = 60

const categorySlug = 'troubleshooting'
const category = getBlogCategory(categorySlug)

export const metadata: Metadata = {
  title: `${category.label} | Blog`,
  description: category.description,
  alternates: { canonical: `/blog/${categorySlug}` },
}

export default function TroubleshootingBlogPage() {
  return <BlogCategoryPage categorySlug={categorySlug} />
}
