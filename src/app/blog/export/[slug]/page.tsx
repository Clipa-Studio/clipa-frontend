import type { Metadata } from 'next'
import BlogArticlePage, { generateBlogArticleMetadata } from '../../_components/BlogArticlePage'

const categorySlug = 'export'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateBlogArticleMetadata(categorySlug, slug)
}

export default async function ExportBlogArticlePage({ params }: Props) {
  const { slug } = await params
  return <BlogArticlePage categorySlug={categorySlug} cleanSlug={slug} />
}

