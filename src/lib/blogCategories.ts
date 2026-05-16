import type { BlogPost } from './blog'

export const BLOG_CATEGORIES = [
  {
    slug: 'overview',
    label: 'Overview',
    description: 'Product context and end-to-end Clipa workflow articles.',
  },
  {
    slug: 'capture',
    label: 'Capture',
    description: 'Screen recording setup, capture quality, and recording workflow articles.',
  },
  {
    slug: 'edit',
    label: 'Edit',
    description: 'Timeline editing, zoom, audio, trimming, and polishing articles.',
  },
  {
    slug: 'export',
    label: 'Export',
    description: 'Export quality, upscaling, delivery, and final video output articles.',
  },
  {
    slug: 'compare',
    label: 'Compare',
    description: 'Tool comparisons and alternative workflow articles.',
  },
  {
    slug: 'use-cases',
    label: 'Use Cases',
    description: 'Practical workflows for demos, courses, tutorials, and launches.',
  },
  {
    slug: 'troubleshooting',
    label: 'Troubleshooting',
    description: 'Fixes for common screen recording and editing problems.',
  },
] as const

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug']

type BlogPostRoute = {
  currentSlug: string
  categorySlug: BlogCategorySlug
  cleanSlug: string
}

export const BLOG_POST_ROUTE_MAPPINGS: BlogPostRoute[] = [
  {
    currentSlug: 'clipa-studio-record-edit-and-export-screen-videos-in-one-native-mac-app-1776084463125',
    categorySlug: 'overview',
    cleanSlug: 'clipa-studio-record-edit-export-screen-videos',
  },
  {
    currentSlug: 'how-to-fix-screen-recording-audio-out-of-sync-on-mac-1778588656058',
    categorySlug: 'troubleshooting',
    cleanSlug: 'fix-screen-recording-audio-out-of-sync-on-mac',
  },
  {
    currentSlug: 'clipa-for-mac-screen-recording-and-editing-1778512517340',
    categorySlug: 'compare',
    cleanSlug: 'clipa-for-mac-screen-recording-and-editing',
  },
  {
    currentSlug: 'screen-studio-alternative-guide-for-mac-creators-1778422783464',
    categorySlug: 'compare',
    cleanSlug: 'screen-studio-alternative-guide-for-mac-creators',
  },
  {
    currentSlug: 'product-demo-video-on-mac-how-to-make-one-1778418993926',
    categorySlug: 'use-cases',
    cleanSlug: 'product-demo-video-on-mac',
  },
  {
    currentSlug: 'how-to-record-professional-looking-online-course-videos-on-mac-1777713117010',
    categorySlug: 'capture',
    cleanSlug: 'record-online-course-videos-on-mac',
  },
  {
    currentSlug: 'how-to-trim-a-screen-recording-on-mac-1777959230762',
    categorySlug: 'edit',
    cleanSlug: 'how-to-trim-a-screen-recording-on-mac',
  },
  {
    currentSlug: 'how-to-speed-up-a-screen-recording-on-mac-1777703123942',
    categorySlug: 'edit',
    cleanSlug: 'how-to-speed-up-a-screen-recording-on-mac',
  },
  {
    currentSlug: 'add-background-music-to-screen-recording-on-mac-no-imovie-needed-1777296968787',
    categorySlug: 'edit',
    cleanSlug: 'add-background-music-to-screen-recording-on-mac',
  },
  {
    currentSlug: 'how-ai-upscaling-turns-blurry-mac-screen-recordings-into-4k-1776694854042',
    categorySlug: 'export',
    cleanSlug: 'ai-upscaling-mac-screen-recording',
  },
  {
    currentSlug: 'how-to-add-zoom-effects-to-mac-screen-recordings-without-the-editing-hours-1776489215323',
    categorySlug: 'edit',
    cleanSlug: 'add-zoom-effects-to-mac-screen-recordings',
  },
]

const BLOG_CATEGORY_SLUGS = new Set<string>(BLOG_CATEGORIES.map((category) => category.slug))
const ROUTE_BY_CURRENT_SLUG = new Map(BLOG_POST_ROUTE_MAPPINGS.map((route) => [route.currentSlug, route]))
const ROUTE_BY_CATEGORY_PATH = new Map(
  BLOG_POST_ROUTE_MAPPINGS.map((route) => [`${route.categorySlug}/${route.cleanSlug}`, route]),
)

export function isBlogCategorySlug(value: string): value is BlogCategorySlug {
  return BLOG_CATEGORY_SLUGS.has(value)
}

export function getBlogCategory(slug: BlogCategorySlug) {
  return BLOG_CATEGORIES.find((category) => category.slug === slug)!
}

export function getPostRouteInfo(post: Pick<BlogPost, 'slug'> & { category_slug?: string | null }) {
  const mappedRoute = ROUTE_BY_CURRENT_SLUG.get(post.slug)
  if (mappedRoute) {
    return {
      categorySlug: mappedRoute.categorySlug,
      cleanSlug: mappedRoute.cleanSlug,
    }
  }

  const categorySlug = post.category_slug && isBlogCategorySlug(post.category_slug)
    ? post.category_slug
    : 'overview'

  return {
    categorySlug,
    cleanSlug: post.slug,
  }
}

export function getBlogPostHref(post: Pick<BlogPost, 'slug'> & { category_slug?: string | null }) {
  const route = getPostRouteInfo(post)
  return `/blog/${route.categorySlug}/${route.cleanSlug}`
}

export function getPostsForBlogCategory(posts: BlogPost[], categorySlug: BlogCategorySlug) {
  return posts.filter((post) => getPostRouteInfo(post).categorySlug === categorySlug)
}

export function resolveCurrentSlugForCategoryPath(categorySlug: BlogCategorySlug, cleanSlug: string) {
  return ROUTE_BY_CATEGORY_PATH.get(`${categorySlug}/${cleanSlug}`)?.currentSlug ?? cleanSlug
}

