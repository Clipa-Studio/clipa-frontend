import type { Metadata } from 'next'
import BlogCategoryPage from '../_components/BlogCategoryPage'
import { getBlogCategory } from '../../../lib/blogCategories'

export const dynamic = 'force-dynamic'

const categorySlug = 'compare'
const category = getBlogCategory(categorySlug)

export const metadata: Metadata = {
  title: `${category.label} | Blog`,
  description: category.description,
  alternates: { canonical: `/blog/${categorySlug}` },
}

export default function CompareBlogPage() {
  return <BlogCategoryPage categorySlug={categorySlug} />
}

