'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import type { BlogPost } from '../../../lib/blog'

interface BlogDetailClientProps {
  initialPost: BlogPost | null
  backHref?: string
  backLabel?: string
}

export default function BlogDetailClient({
  initialPost,
  backHref = '/blog/overview',
  backLabel = 'Back to Blog',
}: BlogDetailClientProps) {
  const post = initialPost

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0C0C14]">
        <Header />
        <main className="relative z-10 max-w-3xl mx-auto pt-28 pb-20 px-4 flex-grow w-full">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-white/50 hover:text-primary-400 font-medium mb-10 transition-colors"
          >
            &larr; {backLabel}
          </Link>
          <h1 className="text-3xl font-bold text-white mb-4">Post not found</h1>
          <p className="text-white/50">This post is not available.</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0C14]">
      <Header />
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[15%] right-[8%] w-56 h-56 rounded-2xl bg-gradient-to-br from-purple-500/[0.04] to-purple-600/[0.02] rotate-[15deg] blur-sm" />
      </div>
      <main className="relative z-10 max-w-3xl mx-auto pt-28 pb-20 px-4 flex-grow w-full">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-white/50 hover:text-primary-400 font-medium mb-10 transition-colors"
        >
          &larr; {backLabel}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          {post.published_at && (
            <time className="text-sm text-white/50">
              {new Date(post.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
          {!post.published && (
            <span className="inline-block bg-yellow-500/10 text-yellow-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-yellow-500/20">
              Draft
            </span>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-lg text-white/50 mb-10 leading-relaxed">{post.excerpt}</p>
        )}

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-2xl max-h-[480px] object-cover mb-12 border border-white/10"
          />
        )}

        <article className="blog-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {post.content}
          </ReactMarkdown>
        </article>

      </main>
      <Footer />
    </div>
  )
}
