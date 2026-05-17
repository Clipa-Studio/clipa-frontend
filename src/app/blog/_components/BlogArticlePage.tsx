import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBlogCategory, getPostRouteInfo, type BlogCategorySlug } from '../../../lib/blogCategories'
import { getPublishedPostForCategoryPath, getPublishedPostSummaries } from '../../../lib/publicContent'
import BlogDetailClient from '../[slug]/BlogDetailClient'

export async function generateBlogArticleStaticParams(categorySlug: BlogCategorySlug) {
  const posts = await getPublishedPostSummaries()

  return posts
    .map((post) => getPostRouteInfo(post))
    .filter((route) => route.categorySlug === categorySlug)
    .map((route) => ({ slug: route.cleanSlug }))
}

export async function generateBlogArticleMetadata(
  categorySlug: BlogCategorySlug,
  cleanSlug: string,
): Promise<Metadata> {
  const category = getBlogCategory(categorySlug)
  const post = await getPublishedPostForCategoryPath(categorySlug, cleanSlug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  const canonical = `/blog/${categorySlug}/${cleanSlug}`

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
      section: category.label,
      ...(post.cover_image_url && {
        images: [{ url: post.cover_image_url }],
      }),
    },
  }
}

interface BlogArticlePageProps {
  categorySlug: BlogCategorySlug
  cleanSlug: string
}

export default async function BlogArticlePage({ categorySlug, cleanSlug }: BlogArticlePageProps) {
  const category = getBlogCategory(categorySlug)
  const post = await getPublishedPostForCategoryPath(categorySlug, cleanSlug)
  const canonical = `https://www.clipa.studio/blog/${categorySlug}/${cleanSlug}`

  if (!post) notFound()

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    articleSection: category.label,
    author: {
      '@type': 'Organization',
      name: 'Clipa',
      url: 'https://www.clipa.studio',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Clipa',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.clipa.studio/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <BlogDetailClient
        initialPost={post}
        backHref={`/blog/${categorySlug}`}
        backLabel={`Back to ${category.label}`}
      />
    </>
  )
}
