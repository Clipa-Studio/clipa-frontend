'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getSubscription } from '../../../lib/subscription'
import { redirectToApp } from '../../../lib/deeplink'
import { startDownload } from '../../../lib/startDownload'

export default function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')

  useEffect(() => {
    const handleCallback = async () => {
      const isAdminHost = window.location.hostname === 'admin.clipa.studio'
      // PKCE flow: URL에 code가 있으면 세션으로 교환
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      let session = null
      let error = null

      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code)
        session = result.data.session
        error = result.error
        console.log('[Auth Callback] exchangeCodeForSession:', { hasSession: !!session, error })
      } else {
        const result = await supabase.auth.getSession()
        session = result.data.session
        error = result.error
        console.log('[Auth Callback] getSession:', { hasSession: !!session, error })
      }

      if (error || !session) {
        console.error('Auth callback error:', error)
        router.push('/')
        return
      }

      const data = { session }

      const state = searchParams.get('state') || ''
      const user = data.session.user

      if (from === 'admin' || isAdminHost) {
        router.replace('/admin')
        return
      }

      // 구독 상태 조회
      const subscription = await getSubscription(user.id)
      const hasActive = subscription?.status === 'active' || subscription?.status === 'past_due'

      if (from === 'app' || from === 'app-dev') {
        if (hasActive) {
          // 구독 있음 → 바로 앱으로 딥링크 콜백
          try {
            await redirectToApp(data.session, state)
          } catch (e) {
            console.error('Failed to redirect to app:', e)
            router.push('/')
          }
        } else {
          // 구독 없음 → pricing 페이지로 이동 (결제 완료 후 앱으로 콜백)
          router.replace(`/pricing?from=${from}&state=${encodeURIComponent(state)}`)
        }
      } else if (from === 'pricing') {
        router.replace('/pricing')
      } else if (from === 'download') {
        const downloadLocation = sessionStorage.getItem('clipa:pendingDownloadLocation') || searchParams.get('location') || 'login'
        const downloadReferrer = sessionStorage.getItem('clipa:pendingDownloadReferrer') || searchParams.get('referrer') || 'Direct visit'
        startDownload(downloadLocation, downloadReferrer)
        sessionStorage.removeItem('clipa:pendingDownloadLocation')
        sessionStorage.removeItem('clipa:pendingDownloadReferrer')
        router.replace('/')
      } else {
        // 웹에서 진입한 경우
        router.push('/')
      }
    }

    handleCallback()
  }, [from, router, searchParams])

  const isFromDownload = from === 'download'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0C14]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto mb-4"></div>
        <p className="text-white/50">
          {isFromDownload ? 'Signed in. Preparing your download...' : 'Signing you in...'}
        </p>
      </div>
    </div>
  )
}
