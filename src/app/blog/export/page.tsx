import type { Metadata } from 'next'
import BlogCategoryPage from '../_components/BlogCategoryPage'
import { getBlogCategory } from '../../../lib/blogCategories'

export const revalidate = 60

const categorySlug = 'export'
const category = getBlogCategory(categorySlug)

export const metadata: Metadata = {
  title: `${category.label} | Blog`,
  description: category.description,
  alternates: { canonical: `/blog/${categorySlug}` },
}

export default function ExportBlogPage() {
  return <BlogCategoryPage categorySlug={categorySlug} />
}
