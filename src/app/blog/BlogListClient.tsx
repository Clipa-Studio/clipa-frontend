'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useAdmin } from '../../hooks/useAdmin'
import { getAllPosts } from '../../lib/blog'
import type { BlogPost } from '../../lib/blog'
import {
  BLOG_CATEGORIES,
  getBlogCategory,
  getBlogPostHref,
  getPostsForBlogCategory,
  type BlogCategorySlug,
} from '../../lib/blogCategories'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getPostHref(post: BlogPost): string {
  return getBlogPostHref(post)
}

function HeroCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={getPostHref(post)}
      className="group flex h-full flex-col glass-card-static !rounded-2xl overflow-hidden hover:!border-primary-400/30"
    >
      {post.cover_image_url && (
        <div className="aspect-[2/1] overflow-hidden shrink-0">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}
      <div className="p-6 md:p-8 flex flex-1 flex-col">
        <div className="flex min-h-7 items-center gap-3 mb-3">
          {post.published_at && (
            <time className="text-sm text-white/50">
              {formatDate(post.published_at)}
            </time>
          )}
          {!post.published && (
            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
              Draft
            </span>
          )}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-primary-300 transition-colors mb-3 line-clamp-2">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-base text-white/50 line-clamp-3 leading-relaxed">
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  )
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={getPostHref(post)}
      className="group flex h-full min-h-[455px] flex-col glass-card-static !rounded-2xl overflow-hidden hover:!border-primary-400/30 hover:-translate-y-1 transition-all duration-200"
    >
      {post.cover_image_url && (
        <div className="aspect-video overflow-hidden shrink-0">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}
      <div className="p-5 flex flex-1 flex-col">
        <div className="flex min-h-7 items-center gap-2 mb-3">
          {post.published_at && (
            <time className="text-xs text-white/50">
              {formatDate(post.published_at)}
            </time>
          )}
          {!post.published && (
            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
              Draft
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-white group-hover:text-primary-300 transition-colors mb-3 leading-snug line-clamp-3">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-sm text-white/50 line-clamp-3 leading-relaxed mt-auto">
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  )
}

interface BlogListClientProps {
  initialPosts: BlogPost[]
  categorySlug?: BlogCategorySlug
}

export default function BlogListClient({ initialPosts, categorySlug }: BlogListClientProps) {
  const pathname = usePathname()
  const { isAdmin } = useAdmin()
  const [adminPosts, setAdminPosts] = useState<BlogPost[] | null>(null)
  const [pendingCategorySlug, setPendingCategorySlug] = useState<BlogCategorySlug | null>(null)
  const [loading, setLoading] = useState(false)
  const category = categorySlug ? getBlogCategory(categorySlug) : null

  useEffect(() => {
    if (!isAdmin) return

    async function fetchPosts() {
      await Promise.resolve()
      setLoading(true)
      try {
        const data = await getAllPosts()
        setAdminPosts(data)
      } catch (err) {
        console.error('Failed to fetch posts:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [isAdmin])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPendingCategorySlug(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [pathname])

  const posts = isAdmin && adminPosts ? adminPosts : initialPosts
  const visiblePosts = categorySlug ? getPostsForBlogCategory(posts, categorySlug) : posts
  const showContentLoading = loading && visiblePosts.length === 0
  const heroPost = visiblePosts[0]
  const restPosts = visiblePosts.slice(1)

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0C14]">
      <Header />
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] right-[10%] w-64 h-40 rounded-3xl bg-gradient-to-br from-blue-500/[0.08] to-indigo-600/[0.04] rotate-[10deg] blur-sm" />
        <div className="absolute bottom-[30%] left-[8%] w-48 h-48 rounded-2xl bg-gradient-to-br from-purple-500/[0.07] to-purple-600/[0.03] rotate-[-8deg] blur-sm" />
      </div>
      <main className="relative z-10 section-glow max-w-5xl mx-auto pt-28 pb-16 px-4 flex-grow w-full">
        <div
          className="relative text-center mb-14"
          aria-busy={pendingCategorySlug !== null}
        >
          {pendingCategorySlug && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-[#0C0C14]/45 backdrop-blur-[2px]">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-primary-300" />
            </div>
          )}
          <h1 className="heading-lg font-bold text-white mb-4 animate-on-load delay-1">
            {category ? (
              <>
                {category.label} <span className="gradient-text">articles</span>
              </>
            ) : (
              <>
                News, tips, and <span className="gradient-text">stories</span>
              </>
            )}
          </h1>
          <p className="text-base sm:text-lg text-white/50 max-w-lg mx-auto animate-on-load delay-2">
            {category?.description ?? 'From the Clipa team.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2 animate-on-load delay-3">
            {BLOG_CATEGORIES.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                onClick={(event) => {
                  if (
                    item.slug === categorySlug ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  ) {
                    return
                  }

                  setPendingCategorySlug(item.slug)
                }}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  item.slug === categorySlug
                    ? 'border-primary-400/50 bg-primary-400/10 text-primary-200'
                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {isAdmin && (
            <Link
              href="/blog/new"
              className="btn-block btn-block-sm mt-6 animate-on-load delay-3"
            >
              New Post
            </Link>
          )}
        </div>

        {showContentLoading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-on-load">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto mb-4" />
            <p className="text-white/50 text-sm">Loading posts...</p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-on-load">
            <svg className="w-12 h-12 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-white/50 text-sm">No posts yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {heroPost && (
              <div className="animate-on-load">
                <HeroCard post={heroPost} />
              </div>
            )}

            {restPosts.length > 0 && (
              <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {restPosts.map((post, i) => (
                  <div key={post.id} className="animate-on-load h-full" style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
                    <PostCard post={post} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
