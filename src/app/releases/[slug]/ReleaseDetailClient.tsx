'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import type { Release } from '../../../lib/releases'

interface ReleaseDetailClientProps {
  initialRelease: Release | null
}

export default function ReleaseDetailClient({ initialRelease }: ReleaseDetailClientProps) {
  const release = initialRelease

  if (!release) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0C0C14]">
        <Header />
        <main className="max-w-3xl mx-auto pt-28 pb-16 px-4 flex-grow w-full">
          <h1 className="text-2xl font-bold text-white mb-4">404 - Release Not Found</h1>
          <p className="text-white/50 mb-6">The release you are looking for does not exist.</p>
          <Link
            href="/releases"
            className="text-primary-400 hover:text-primary-300 font-medium"
          >
            &larr; Back to Releases
          </Link>
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
        <div className="absolute top-[20%] left-[10%] w-48 h-48 rounded-2xl bg-gradient-to-br from-green-500/[0.04] to-emerald-600/[0.02] rotate-[-10deg] blur-sm" />
      </div>
      <main className="relative z-10 max-w-3xl mx-auto pt-28 pb-20 px-4 flex-grow w-full">
        <Link
          href="/releases"
          className="inline-flex items-center gap-1 text-white/50 hover:text-primary-400 font-medium mb-10 transition-colors"
        >
          &larr; Back to Releases
        </Link>

        <div className="flex items-center gap-3 mb-3">
          {release.published_at && (
            <time className="text-sm text-white/50">
              {new Date(release.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
          {!release.published && (
            <span className="inline-block bg-yellow-500/10 text-yellow-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-yellow-500/20">
              Draft
            </span>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight tracking-tight">
          v{release.version}
        </h1>

        <p className="text-lg text-white/50 mb-10 leading-relaxed">{release.title}</p>

        <article className="blog-prose">
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>{release.content}</ReactMarkdown>
        </article>

      </main>
      <Footer />
    </div>
  )
}
