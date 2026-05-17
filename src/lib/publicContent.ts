import 'server-only'

import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import type { BlogPost, BlogPostSummary } from './blog'
import type { Release, ReleaseSummary } from './releases'
import { resolveCurrentSlugForCategoryPath, type BlogCategorySlug } from './blogCategories'

export const PUBLIC_CONTENT_REVALIDATE_SECONDS = 60

export const PUBLIC_BLOG_TAG = 'public-blog-posts'
export const PUBLIC_RELEASES_TAG = 'public-releases'

const blogPostSummaryColumns = [
  'id',
  'title',
  'slug',
  'excerpt',
  'cover_image_url',
  'category_slug',
  'published',
  'published_at',
  'updated_at',
].join(', ')

const releaseSummaryColumns = [
  'id',
  'version',
  'slug',
  'title',
  'published',
  'published_at',
  'updated_at',
].join(', ')

export const getPublishedPostSummaries = unstable_cache(
  async (): Promise<BlogPostSummary[]> => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(blogPostSummaryColumns)
      .eq('published', true)
      .order('published_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as BlogPostSummary[]
  },
  ['public-blog-post-summaries'],
  {
    revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
    tags: [PUBLIC_BLOG_TAG],
  },
)

export const getPublishedPostBySlug = unstable_cache(
  async (slug: string): Promise<BlogPost | null> => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()

    if (error) throw error
    return data as unknown as BlogPost | null
  },
  ['public-blog-post-by-slug'],
  {
    revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
    tags: [PUBLIC_BLOG_TAG],
  },
)

export async function getPublishedPostForCategoryPath(
  categorySlug: BlogCategorySlug,
  cleanSlug: string,
): Promise<BlogPost | null> {
  const lookupSlugs = Array.from(new Set([
    resolveCurrentSlugForCategoryPath(categorySlug, cleanSlug),
    cleanSlug,
  ]))

  for (const lookupSlug of lookupSlugs) {
    const post = await getPublishedPostBySlug(lookupSlug)
    if (post) return post
  }

  return null
}

export const getPublishedReleaseSummaries = unstable_cache(
  async (): Promise<ReleaseSummary[]> => {
    const { data, error } = await supabase
      .from('releases')
      .select(releaseSummaryColumns)
      .eq('published', true)
      .order('published_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as ReleaseSummary[]
  },
  ['public-release-summaries'],
  {
    revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
    tags: [PUBLIC_RELEASES_TAG],
  },
)

export const getPublishedReleaseBySlug = unstable_cache(
  async (slug: string): Promise<Release | null> => {
    const { data, error } = await supabase
      .from('releases')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()

    if (error) throw error
    return data as unknown as Release | null
  },
  ['public-release-by-slug'],
  {
    revalidate: PUBLIC_CONTENT_REVALIDATE_SECONDS,
    tags: [PUBLIC_RELEASES_TAG],
  },
)
