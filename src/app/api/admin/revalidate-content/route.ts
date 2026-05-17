import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  BLOG_CATEGORIES,
  getPostRouteInfo,
  isBlogCategorySlug,
  type BlogCategorySlug,
} from '../../../../lib/blogCategories'
import { PUBLIC_BLOG_TAG, PUBLIC_RELEASES_TAG } from '../../../../lib/publicContent'

type RevalidateResource = 'blog' | 'releases' | 'all'

type RevalidateBody = {
  resource?: RevalidateResource
  slug?: string
  categorySlug?: BlogCategorySlug
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!token) return false

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  )

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData.user) return false

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  return !profileError && profile?.role === 'admin'
}

function revalidateBlog(slug?: string, categorySlug?: BlogCategorySlug) {
  revalidateTag(PUBLIC_BLOG_TAG)
  revalidatePath('/blog')

  for (const category of BLOG_CATEGORIES) {
    revalidatePath(`/blog/${category.slug}`)
  }

  if (slug) {
    const route = getPostRouteInfo({ slug, category_slug: categorySlug })
    revalidatePath(`/blog/${slug}`)
    revalidatePath(`/blog/${route.categorySlug}/${route.cleanSlug}`)
    if (categorySlug) revalidatePath(`/blog/${categorySlug}/${slug}`)
  }

  revalidatePath('/sitemap.xml')
}

function revalidateReleases(slug?: string) {
  revalidateTag(PUBLIC_RELEASES_TAG)
  revalidatePath('/releases')
  if (slug) revalidatePath(`/releases/${slug}`)
  revalidatePath('/sitemap.xml')
}

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return jsonError('Admin access required.', 403)
  }

  const body = await request.json().catch(() => ({})) as RevalidateBody
  const resource = body.resource ?? 'all'

  if (resource !== 'blog' && resource !== 'releases' && resource !== 'all') {
    return jsonError('Unknown revalidation resource.', 400)
  }

  const slug = typeof body.slug === 'string' && body.slug.length > 0 ? body.slug : undefined
  const categorySlug = typeof body.categorySlug === 'string' && isBlogCategorySlug(body.categorySlug)
    ? body.categorySlug
    : undefined

  if (resource === 'blog' || resource === 'all') {
    revalidateBlog(slug, categorySlug)
  }

  if (resource === 'releases' || resource === 'all') {
    revalidateReleases(slug)
  }

  return NextResponse.json({ ok: true })
}
