import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import type { BlogPost } from '../../../lib/blog'
import { getBlogPostHref } from '../../../lib/blogCategories'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, cover_image_url, slug, category_slug')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  const canonical = getBlogPostHref(post as BlogPost)

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

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (!post) notFound()

  permanentRedirect(getBlogPostHref(post as BlogPost))
}
