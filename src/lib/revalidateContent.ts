import { supabase } from './supabase'
import type { BlogCategorySlug } from './blogCategories'

type RevalidatePublicContentOptions = {
  resource: 'blog' | 'releases' | 'all'
  slug?: string
  categorySlug?: BlogCategorySlug
}

export async function revalidatePublicContent(options: RevalidatePublicContentOptions) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const response = await fetch('/api/admin/revalidate-content', {
      method: 'POST',
      keepalive: true,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })

    return response.ok
  } catch {
    return false
  }
}
