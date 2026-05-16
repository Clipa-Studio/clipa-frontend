'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Header from '../../../components/Header'
import { useAuth } from '../../../contexts/AuthContext'
import { useAdmin } from '../../../hooks/useAdmin'
import { createRelease, generateReleaseSlug } from '../../../lib/releases'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export default function ReleaseEditorClient() {
  const router = useRouter()
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()

  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (adminLoading) {
    return (
      <>
        <Header />
        <div className="max-w-3xl mx-auto pt-28 pb-16 px-4">
          <p className="text-gray-500">Loading...</p>
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="max-w-3xl mx-auto pt-28 pb-16 px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access denied</h1>
          <p className="text-gray-500 mb-6">You do not have permission to create releases.</p>
          <Link href="/releases" className="text-primary-400 hover:text-primary-300 font-medium">
            Back to Releases
          </Link>
        </div>
      </>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    try {
      const slug = generateReleaseSlug(version)
      const release = await createRelease({
        version,
        slug,
        title,
        content,
        published,
        published_at: published ? new Date().toISOString() : null,
        author_id: user.id,
      })
      router.push(release.published ? `/releases/${release.slug}` : `/admin/releases/${release.slug}/edit`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create release')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors'

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto pt-28 pb-16 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">New Release</h1>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-500 mb-1">
                Version
              </label>
              <input
                id="version"
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={inputClass}
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-500 mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="Bug fixes and improvements"
              />
            </div>
          </div>

          <div data-color-mode="light">
            <label htmlFor="content" className="block text-sm font-medium text-gray-500 mb-1">
              Release Notes
            </label>
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={400}
              preview="live"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="published"
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="published" className="text-sm font-medium text-gray-500">
              Publish immediately
            </label>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Release'}
            </button>
            <Link href="/releases" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}
