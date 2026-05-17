import type { Metadata } from 'next'
import BlogCategoryPage from '../_components/BlogCategoryPage'
import { getBlogCategory } from '../../../lib/blogCategories'

export const revalidate = 60

const categorySlug = 'use-cases'
const category = getBlogCategory(categorySlug)

export const metadata: Metadata = {
  title: `${category.label} | Blog`,
  description: category.description,
  alternates: { canonical: `/blog/${categorySlug}` },
}

export default function UseCasesBlogPage() {
  return <BlogCategoryPage categorySlug={categorySlug} />
}
