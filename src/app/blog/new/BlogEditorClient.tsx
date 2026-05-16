'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Header from '../../../components/Header'
import { useAuth } from '../../../contexts/AuthContext'
import { useAdmin } from '../../../hooks/useAdmin'
import { createPost, generateUniqueSlug } from '../../../lib/blog'
import {
  BLOG_CATEGORIES,
  getBlogPostHref,
  type BlogCategorySlug,
} from '../../../lib/blogCategories'
import { uploadBlogImage, uploadBlogVideo } from '../../../lib/storage'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export default function BlogEditorClient() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const isAdminRoute = pathname.startsWith('/admin')
  const pageClass = isAdminRoute
    ? 'max-w-5xl mx-auto pb-10'
    : 'max-w-5xl mx-auto pt-28 pb-16 px-4'

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [categorySlug, setCategorySlug] = useState<BlogCategorySlug>('overview')
  const [published, setPublished] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverPreview(URL.createObjectURL(file))
    setUploading(true)
    setError(null)
    try {
      const url = await uploadBlogImage(file)
      setCoverImageUrl(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이미지를 업로드하지 못했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const getEditorCursorPosition = (): number | null => {
    const textarea = editorRef.current?.querySelector('textarea')
    if (textarea) return textarea.selectionStart
    return null
  }

  const insertAtPosition = (text: string, position: number | null) => {
    setContent((prev) => {
      if (position === null || position > prev.length) return prev + text
      return prev.slice(0, position) + text + prev.slice(position)
    })
  }

  const handleEditorDrop = async (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    e.preventDefault()
    const cursorPos = getEditorCursorPosition()
    setUploadingMedia(true)
    setError(null)

    try {
      let offset = 0
      for (const file of files) {
        let tag = ''
        if (file.type.startsWith('image/')) {
          const url = await uploadBlogImage(file)
          tag = `\n![${file.name}](${url})\n`
        } else if (file.type.startsWith('video/')) {
          const url = await uploadBlogVideo(file)
          tag = `\n<video src="${url}" controls playsinline></video>\n`
        }
        if (tag) {
          const pos = cursorPos !== null ? cursorPos + offset : null
          insertAtPosition(tag, pos)
          offset += tag.length
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '미디어를 업로드하지 못했습니다.')
    } finally {
      setUploadingMedia(false)
    }
  }

  if (adminLoading) {
    return (
      <>
        {!isAdminRoute && <Header />}
        <div className={pageClass}>
          <p className="text-gray-500">불러오는 중...</p>
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        {!isAdminRoute && <Header />}
        <div className={pageClass}>
          <h1 className={isAdminRoute ? 'text-2xl font-bold text-white mb-4' : 'text-2xl font-bold text-gray-900 mb-4'}>접근 권한 없음</h1>
          <p className="text-gray-500 mb-6">블로그 글을 만들 권한이 없습니다.</p>
          <Link href="/blog/overview" className="text-primary-400 hover:text-primary-300 font-medium">
            블로그로 돌아가기
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
      const slug = await generateUniqueSlug(title)
      const post = await createPost({
        title,
        slug,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        category_slug: categorySlug,
        published,
        published_at: published ? new Date().toISOString() : null,
        author_id: user.id,
      })
      router.push(
        post.published
          ? (isAdminRoute ? '/admin/blog' : getBlogPostHref(post))
          : `/admin/blog/${post.id}/edit`,
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '글을 만들지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = isAdminRoute
    ? 'w-full rounded-lg border border-white/10 bg-[#0C0C14] px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-white/30'
    : 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors'
  const labelClass = isAdminRoute
    ? 'block text-sm font-medium text-white/45 mb-1'
    : 'block text-sm font-medium text-gray-500 mb-1'
  const actionClass = isAdminRoute
    ? 'rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0C0C14] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50'
    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <>
      {!isAdminRoute && <Header />}
      <div className={pageClass}>
        <h1 className={isAdminRoute ? 'text-3xl font-bold text-white mb-8' : 'text-3xl font-bold text-gray-900 mb-8'}>새 블로그 글</h1>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className={labelClass}>
              제목
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="글 제목"
            />
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              카테고리
            </label>
            <select
              id="category"
              required
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value as BlogCategorySlug)}
              className={inputClass}
            >
              {BLOG_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="excerpt" className={labelClass}>
              요약
            </label>
            <textarea
              id="excerpt"
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={inputClass}
              placeholder="글의 짧은 요약"
            />
          </div>

          <div data-color-mode={isAdminRoute ? 'dark' : 'light'}>
            <label htmlFor="content" className={labelClass}>
              내용
            </label>
            <div
              ref={editorRef}
              onDrop={handleEditorDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || '')}
                height={800}
                preview="live"
              />
            </div>
            {uploadingMedia && (
              <p className="mt-2 text-sm text-gray-400">미디어 업로드 중...</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              커버 이미지
            </label>
            {(coverPreview || coverImageUrl) && (
              <div className="mb-3 relative">
                <img
                  src={coverPreview || coverImageUrl}
	                  alt="커버 미리보기"
                  className={isAdminRoute ? 'w-full max-h-48 object-cover rounded-lg border border-white/10' : 'w-full max-h-48 object-cover rounded-xl border border-gray-200'}
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
	                    <span className="text-white text-sm font-medium">업로드 중...</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setCoverPreview(''); setCoverImageUrl('') }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 transition-colors text-sm"
                >
                  &times;
                </button>
              </div>
            )}
            <label
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
                isAdminRoute
                  ? 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/70'
                  : 'border-gray-300 text-gray-500 hover:border-primary-500 hover:text-primary-400'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
	              {uploading ? '업로드 중...' : '커버 이미지 업로드'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="published"
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className={isAdminRoute ? 'h-4 w-4 rounded border-white/20 bg-[#0C0C14] text-primary-500 focus:ring-primary-500' : 'h-4 w-4 rounded border-gray-300 bg-white text-primary-500 focus:ring-primary-500'}
            />
            <label htmlFor="published" className={isAdminRoute ? 'text-sm font-medium text-white/55' : 'text-sm font-medium text-gray-500'}>
              바로 게시
            </label>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={actionClass}
            >
	              {submitting ? '생성 중...' : '글 만들기'}
            </button>
            <Link href={isAdminRoute ? '/admin/blog' : '/blog/overview'} className={isAdminRoute ? 'text-white/50 hover:text-white font-medium transition-colors' : 'text-gray-500 hover:text-gray-900 font-medium transition-colors'}>
	              취소
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}
