'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import type { Release } from '../../lib/releases'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function ReleaseMeta({ release, isLatest }: { release: Release; isLatest?: boolean }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {release.published_at && (
        <time className="text-sm text-white/50">
          {formatDate(release.published_at)}
        </time>
      )}
      {isLatest && (
        <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2.5 py-0.5 text-xs font-medium text-primary-400 ring-1 ring-inset ring-primary-500/20">
          Latest
        </span>
      )}
      {!release.published && (
        <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
          Draft
        </span>
      )}
    </div>
  )
}

function LatestRelease({ release }: { release: Release }) {
  return (
    <section className="glass-card-static !rounded-2xl p-6 md:p-8">
      <div className="mb-5">
        <ReleaseMeta release={release} isLatest />
      </div>

      <Link href={`/releases/${release.slug}`} className="group block">
        <h2 className="text-3xl md:text-4xl font-bold text-white group-hover:text-primary-300 transition-colors mb-3 leading-tight tracking-tight">
          v{release.version}
        </h2>
        <p className="text-base md:text-lg text-white/50 leading-relaxed">
          {release.title}
        </p>
      </Link>

      <article className="blog-prose mt-8">
        <ReactMarkdown rehypePlugins={[rehypeRaw]}>{release.content}</ReactMarkdown>
      </article>

      <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-white/10">
        <Link
          href={`/releases/${release.slug}`}
          className="btn-block-ghost btn-block-sm"
        >
          View details
        </Link>
      </div>
    </section>
  )
}

function ReleaseListItem({ release }: { release: Release }) {
  return (
    <div className="group flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors">
      <Link href={`/releases/${release.slug}`} className="group min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-base font-semibold text-white group-hover:text-primary-300 transition-colors">
            v{release.version}
          </span>
          <span className="min-w-0 text-sm text-white/60 truncate">
            {release.title}
          </span>
          {!release.published && (
            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
              Draft
            </span>
          )}
        </div>
        {release.published_at && (
          <time className="block text-xs text-white/40">
            {formatDate(release.published_at)}
          </time>
        )}
      </Link>

      <div className="flex shrink-0 items-center gap-4">
        <Link
          href={`/releases/${release.slug}`}
          aria-label={`View release v${release.version}`}
          className="text-white/30 group-hover:text-primary-300 transition-colors"
        >
          &rarr;
        </Link>
      </div>
    </div>
  )
}

interface ReleaseListClientProps {
  initialReleases: Release[]
}

export default function ReleaseListClient({ initialReleases }: ReleaseListClientProps) {
  const releases = initialReleases
  const latestRelease = releases[0]
  const previousReleases = releases.slice(1)

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0C14]">
      <Header />
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[25%] left-[5%] w-56 h-36 rounded-3xl bg-gradient-to-br from-green-500/[0.05] to-emerald-600/[0.02] rotate-[-6deg] blur-sm" />
        <div className="absolute bottom-[25%] right-[12%] w-44 h-44 rounded-2xl bg-gradient-to-br from-purple-500/[0.04] to-violet-600/[0.02] rotate-[12deg] blur-sm" />
      </div>
      <main className="relative z-10 section-glow max-w-3xl mx-auto pt-28 pb-16 px-4 flex-grow w-full">
        <div className="text-center mb-14">
          <h1 className="heading-lg font-bold text-white mb-4 animate-on-load delay-1">
            What's <span className="gradient-text">new</span> in Clipa
          </h1>
          <p className="text-base sm:text-lg text-white/50 max-w-lg mx-auto animate-on-load delay-2">
            All the latest updates and improvements.
          </p>
        </div>

        {releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-on-load">
            <svg className="w-12 h-12 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            <p className="text-white/50 text-sm">No releases yet.</p>
          </div>
        ) : latestRelease ? (
          <div className="space-y-12">
            <div className="animate-on-load">
              <LatestRelease release={latestRelease} />
            </div>

            {previousReleases.length > 0 && (
              <section className="animate-on-load" style={{ animationDelay: '0.16s' }}>
                <div className="flex items-end justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-white">Previous releases</h2>
                    <p className="text-sm text-white/45 mt-1">Browse earlier updates and fixes.</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/10">
                  {previousReleases.map((release) => (
                    <ReleaseListItem
                      key={release.id}
                      release={release}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  )
}
