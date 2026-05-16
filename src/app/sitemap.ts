import type { MetadataRoute } from 'next'
import { BLOG_CATEGORIES, getBlogPostHref } from '../lib/blogCategories'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://www.clipa.studio',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://www.clipa.studio/pricing',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.clipa.studio/releases',
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: 'https://www.clipa.studio/terms',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.clipa.studio/privacy',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.clipa.studio/refund',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const blogCategoryPages: MetadataRoute.Sitemap = BLOG_CATEGORIES.map((category) => ({
    url: `https://www.clipa.studio/blog/${category.slug}`,
    changeFrequency: 'weekly',
    priority: category.slug === 'overview' ? 0.7 : 0.6,
  }))

  try {
    const { supabase } = await import('../lib/supabase')

    const [{ data: posts }, { data: releases }] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('slug, category_slug, updated_at')
        .eq('published', true)
        .order('published_at', { ascending: false }),
      supabase
        .from('releases')
        .select('slug, updated_at')
        .eq('published', true)
        .order('published_at', { ascending: false }),
    ])

    const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
      url: `https://www.clipa.studio${getBlogPostHref(post)}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

    const releasePages: MetadataRoute.Sitemap = (releases ?? []).map((release) => ({
      url: `https://www.clipa.studio/releases/${release.slug}`,
      lastModified: new Date(release.updated_at),
      changeFrequency: 'yearly',
      priority: 0.5,
    }))

    return [...staticPages, ...blogCategoryPages, ...blogPages, ...releasePages]
  } catch {
    return [...staticPages, ...blogCategoryPages]
  }
}
