import type { Metadata } from 'next'
import { supabase } from '../../../lib/supabase'
import { getBlogCategory, resolveCurrentSlugForCategoryPath, type BlogCategorySlug } from '../../../lib/blogCategories'
import BlogDetailClient from '../[slug]/BlogDetailClient'
import type { BlogPost } from '../../../lib/blog'

async function getPublishedPostForCategoryPath(categorySlug: BlogCategorySlug, cleanSlug: string) {
  const lookupSlugs = Array.from(new Set([
    resolveCurrentSlugForCategoryPath(categorySlug, cleanSlug),
    cleanSlug,
  ]))

  for (const lookupSlug of lookupSlugs) {
    const { data: post } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', lookupSlug)
      .eq('published', true)
      .maybeSingle()

    if (post) return post as BlogPost
  }

  return null
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

  const articleJsonLd = post ? {
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
  } : null

  return (
    <>
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      <BlogDetailClient
        initialPost={post}
        slug={post?.slug ?? cleanSlug}
        backHref={`/blog/${categorySlug}`}
        backLabel={`Back to ${category.label}`}
      />
    </>
  )
}

