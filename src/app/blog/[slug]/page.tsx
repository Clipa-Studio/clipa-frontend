import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublishedPostBySlug, getPublishedPostSummaries } from '../../../lib/publicContent'
import { getBlogPostHref } from '../../../lib/blogCategories'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getPublishedPostSummaries()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const post = await getPublishedPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  const canonical = getBlogPostHref(post)

  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      url: canonical,
      type: 'article',
      ...(post.cover_image_url && {
        images: [{ url: post.cover_image_url }],
      }),
    },
  }
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params

  const post = await getPublishedPostBySlug(slug)

  if (!post) notFound()

  permanentRedirect(getBlogPostHref(post))
}
