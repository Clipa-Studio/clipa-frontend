import type { Metadata } from 'next'
import BlogArticlePage, { generateBlogArticleMetadata, generateBlogArticleStaticParams } from '../../_components/BlogArticlePage'

export const revalidate = 60

const categorySlug = 'overview'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return generateBlogArticleStaticParams(categorySlug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return generateBlogArticleMetadata(categorySlug, slug)
}

export default async function OverviewBlogArticlePage({ params }: Props) {
  const { slug } = await params
  return <BlogArticlePage categorySlug={categorySlug} cleanSlug={slug} />
}
