'use client'

import Link from 'next/link'
import AuthenticatedDownloadButton from '../../../components/AuthenticatedDownloadButton'

export default function AppRedirectClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img
              src="/images/logo.png"
              alt="Clipa"
              className="w-16 h-16 rounded-2xl shadow-lg shadow-sky-500/20"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Clipa 앱에서 열어주세요
          </h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            이 링크는 Clipa 앱에서 열어야 합니다.<br />
            앱이 설치되어 있지 않다면 아래에서 다운로드해주세요.
          </p>

          {/* Download Button */}
          <AuthenticatedDownloadButton
            location="app_auth_callback"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-semibold hover:from-sky-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Download Free for Mac
          </AuthenticatedDownloadButton>

          {/* Back to home */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 mt-6 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
