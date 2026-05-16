'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { getPaddle } from '../../lib/paddle'
import { useSubscription } from '../../hooks/useSubscription'
import { getPlanLabel, isActive, isPastDue, isCanceled, isLifetime, isExpired } from '../../types/subscription'
import { analytics } from '../../lib/analytics'
import CancelSubscriptionModal from '../../components/CancelSubscriptionModal'
import UpgradeModal from '../../components/UpgradeModal'
import ActiveDeviceSection from '../../components/my/ActiveDeviceSection'
import Header from '../../components/Header'

async function fetchPortalUrl() {
  const { data, error } = await (await import('../../lib/supabase')).supabase.functions.invoke('subscription-portal')
  if (error || !data?.portal_url) {
    console.error('Failed to fetch portal:', error ?? data)
    return null
  }
  return data.portal_url as string
}

function formatDate(isoString: string | null): string {
  if (!isoString) return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString))
}

export default function MyPageClient() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { subscription, loading: subLoading, refetch } = useSubscription()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [reactivateLoading, setReactivateLoading] = useState(false)
  const [currentTime] = useState(() => Date.now())

  const openManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const portalUrl = await fetchPortalUrl()
      if (!portalUrl) return
      window.open(portalUrl, '_blank')
    } finally {
      setPortalLoading(false)
    }
  }

  // 결제 완료 후 진입 시 구독 정보 갱신
  useEffect(() => {
    if (searchParams.get('fromCheckout') === 'true') {
      refetch()
      // query param 제거하여 새로고침 시 재실행 방지
      window.history.replaceState({}, '', '/mypage')
    }
  }, [searchParams, refetch])

  // Paddle 초기화
  useEffect(() => {
    getPaddle()
  }, [])

  // 비로그인 시 홈으로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/')
    }
  }, [user, authLoading, router])


  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C0C14]">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) {
        console.error('Failed to delete account:', error)
        alert('Failed to delete account. Please try again.')
        return
      }
      await signOut()
      router.push('/')
    } catch (err) {
      console.error('Failed to delete account:', err)
      alert('Failed to delete account. Please try again.')
    } finally {
      setDeleteLoading(false)
      setDeleteModalOpen(false)
    }
  }

  const handleCancelConfirm = async (reason: string, detail?: string) => {
    await analytics.subscriptionCancel(email, reason, detail)
    await openManageSubscription()
    setCancelModalOpen(false)
  }

  const handleReactivate = async () => {
    setReactivateLoading(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      const { error } = await supabase.functions.invoke('reactivate-subscription', { body: {} })
      if (error) {
        console.error('Failed to reactivate subscription:', error)
        alert('Failed to reactivate subscription. Please try again.')
        return
      }
      await new Promise(r => setTimeout(r, 2000))
      refetch()
    } catch (err) {
      console.error('Failed to reactivate subscription:', err)
      alert('Failed to reactivate subscription. Please try again.')
    } finally {
      setReactivateLoading(false)
    }
  }

  // 사용자 정보
  const email = user?.email || ''
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const avatar = user?.user_metadata?.avatar_url || null


  // 구독 상태 파생
  const planLabel = getPlanLabel(subscription)
  const active = isActive(subscription)
  const pastDue = isPastDue(subscription)
  const canceled = isCanceled(subscription)
  const lifetime = isLifetime(subscription)
  const expired = isExpired(subscription)
  // 예약된 변경 존재 여부 (다운그레이드 또는 취소 모두 포함)
  const hasAnyScheduledChange = !!subscription?.scheduled_change_effective_at &&
    new Date(subscription.scheduled_change_effective_at) > new Date()
  // 다운그레이드 예약 (배너 표시용 — interval 정보 필요)
  const hasScheduledChange = hasAnyScheduledChange &&
    !!subscription?.scheduled_change_billing_cycle_interval
  // 취소 예약 (active이지만 다음 결제 없이 종료 예정)
  const hasScheduledCancel = hasAnyScheduledChange && !hasScheduledChange

  const getPlanBadge = () => {
    if (!subscription) return { label: 'No Plan', color: 'bg-white/5 text-white/50 ring-1 ring-inset ring-white/10' }
    if (pastDue) return { label: `${planLabel} (Past Due)`, color: 'bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20' }
    if (canceled && !expired) return { label: `${planLabel} (Canceled)`, color: 'bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20' }
    if (canceled && expired) return { label: 'Expired', color: 'bg-white/5 text-white/50 ring-1 ring-inset ring-white/10' }
    if (lifetime) return { label: 'Lifetime', color: 'bg-primary-500/10 text-primary-400 ring-1 ring-inset ring-primary-500/20' }
    if (planLabel === 'Yearly') return { label: 'Yearly', color: 'bg-primary-500/10 text-primary-400 ring-1 ring-inset ring-primary-500/20' }
    return { label: 'Monthly', color: 'bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20' }
  }

  const planBadge = getPlanBadge()

  return (
    <div className="min-h-screen bg-[#0C0C14]">
      <Header />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 pb-12">
        <h1 className="text-2xl font-bold text-white mb-8">My Account</h1>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
            <div className="flex items-center gap-4">
              {avatar ? (
                <img src={avatar} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                  {email.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-white">{name || 'User'}</p>
                <p className="text-white/50">{email}</p>
                {user?.created_at && (
                  <p className="text-xs text-white/40 mt-1">
                    Joined {formatDate(user.created_at)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Subscription</h2>
                {subscription && !(canceled && expired) && (
                  <p className="text-xs text-white/40 mt-0.5">Since {formatDate(subscription.subscription_created_at)}</p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${planBadge.color}`}>
                {planBadge.label}
              </span>
            </div>

            {/* 상태 배너 */}
            {(() => {
              if (!subscription || (canceled && expired)) {
                return (
                  <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-white">{canceled && expired ? 'Subscription Expired' : 'No Active Subscription'}</p>
                      <p className="text-sm text-white/50">
                        {canceled && expired ? 'Resubscribe to access Pro features.' : 'Subscribe to unlock all features.'}
                      </p>
                    </div>
                    <Link
                      href="/pricing"
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all shrink-0"
                    >
                      {canceled && expired ? 'Resubscribe' : 'Subscribe'}
                    </Link>
                  </div>
                )
              }
              if (lifetime) {
                return (
                  <div className="rounded-xl bg-primary-500/5 border border-primary-500/20 p-4">
                    <p className="font-medium text-primary-400">Lifetime Access</p>
                    <p className="text-sm text-primary-400/70">Active forever — no renewal needed</p>
                  </div>
                )
              }
              if (canceled && !expired) {
                return (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-amber-400">Canceled</p>
                        <p className="text-sm text-amber-400/70">Pro features available until {formatDate(subscription.subscription_period_end)}</p>
                      </div>
                      <button
                        onClick={handleReactivate}
                        disabled={reactivateLoading}
                        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/25 transition-all shrink-0 disabled:opacity-50"
                      >
                        {reactivateLoading ? 'Resubscribing…' : 'Resubscribe'}
                      </button>
                    </div>
                  </div>
                )
              }
              if (pastDue) {
                return (
                  <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                    <p className="font-medium text-red-400">Payment Failed</p>
                    <p className="text-sm text-red-400/70">Please update your payment method to keep your subscription.</p>
                  </div>
                )
              }
              // active
              if (hasScheduledChange) {
                return (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium text-amber-400 text-sm">Scheduled Plan Change</p>
                    </div>
                    <p className="text-sm text-amber-400/70">
                      Your {subscription.billing_cycle_interval === 'year' ? 'yearly' : 'monthly'} subscription will switch to{' '}
                      {subscription.scheduled_change_billing_cycle_interval === 'month' ? 'monthly ($21/month)' : 'yearly ($96/year)'}{' '}
                      on {formatDate(subscription.scheduled_change_effective_at)}.
                    </p>
                  </div>
                )
              }
              if (hasScheduledCancel) {
                return (
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="font-medium text-amber-400 text-sm">Cancellation Scheduled</p>
                        </div>
                        <p className="text-sm text-amber-400/70">
                          Your subscription is active until {formatDate(subscription.scheduled_change_effective_at)}.
                          After this date, your plan will be canceled and Pro features will no longer be available.
                        </p>
                      </div>
                      <button
                        onClick={handleReactivate}
                        disabled={reactivateLoading}
                        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/25 transition-all shrink-0 disabled:opacity-50"
                      >
                        {reactivateLoading ? 'Resubscribing…' : 'Resubscribe'}
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-400">Active</p>
                      <p className="text-sm text-green-400/70">Next billing on {formatDate(subscription.next_billed_at)}</p>
                    </div>
                    {!lifetime && subscription.billing_cycle_interval === 'month' && (
                      <button
                        onClick={() => setUpgradeModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/25 transition-all shrink-0"
                      >
                        Upgrade to Yearly
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* 구독 상세 (구독이 있는 경우) */}
            {subscription && !(canceled && expired) && (
              <div className="mt-5 space-y-5">
                {/* 기간 진행률 (정기 구독만) */}
                {!lifetime && (() => {
                  const start = new Date(subscription.subscription_period_start).getTime()
                  const end = new Date(subscription.subscription_period_end).getTime()
                  const total = end - start
                  const elapsed = Math.min(currentTime - start, total)
                  const progress = Math.round((elapsed / total) * 100)
                  const daysLeft = Math.max(0, Math.ceil((end - currentTime) / (1000 * 60 * 60 * 24)))

                  return (
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/50">Current billing period</span>
                        <span className="text-sm font-medium text-white">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Renewing soon'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-white/40">
                        <span>{formatDate(subscription.subscription_period_start)}</span>
                        <span>{formatDate(subscription.subscription_period_end)}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* 결제 수단 정보 */}
                {subscription.payment_method && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-white/50 mb-3">Payment Method</p>
                    {subscription.payment_method === 'card' && subscription.card_last4 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-white/5 rounded-md border border-white/10 flex items-center justify-center shrink-0">
                          {(() => {
                            const t = subscription.card_type?.toLowerCase() || ''
                            if (t === 'visa') return (
                              <span className="text-[11px] font-bold tracking-tight text-blue-400 italic">VISA</span>
                            )
                            if (t === 'mastercard') return (
                              <div className="flex items-center -space-x-1">
                                <div className="w-3.5 h-3.5 rounded-full bg-red-500 opacity-80" />
                                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 opacity-80" />
                              </div>
                            )
                            if (t === 'american_express' || t === 'amex') return (
                              <span className="text-[8px] font-bold text-blue-400 leading-none text-center">AMEX</span>
                            )
                            if (t === 'discover') return (
                              <span className="text-[8px] font-bold text-orange-400">DISC</span>
                            )
                            if (t === 'jcb') return (
                              <span className="text-[9px] font-bold text-green-400">JCB</span>
                            )
                            return (
                              <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            )
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white tracking-wide">
                            <span className="text-white/60">••••</span>
                            <span className="text-white/60 ml-1.5">••••</span>
                            <span className="text-white/60 ml-1.5">••••</span>
                            <span className="ml-1.5">{subscription.card_last4}</span>
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {subscription.card_type
                              ? subscription.card_type.charAt(0).toUpperCase() + subscription.card_type.slice(1).replace('_', ' ')
                              : 'Card'
                            }
                            {subscription.card_expiry_month && subscription.card_expiry_year && (
                              <span className="ml-2">
                                Expires {String(subscription.card_expiry_month).padStart(2, '0')}/{subscription.card_expiry_year}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-white/5 rounded-md border border-white/10 flex items-center justify-center shrink-0">
                          {subscription.payment_method === 'paypal' ? (
                            <span className="text-[9px] font-bold text-blue-400 italic">PayPal</span>
                          ) : (
                            <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white capitalize">
                          {subscription.payment_method}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 구독 상세 정보 */}
                {canceled && subscription.canceled_at && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-white/40 mb-1">Canceled On</p>
                    <p className="text-sm font-medium text-red-400">{formatDate(subscription.canceled_at)}</p>
                  </div>
                )}

                {(active || pastDue) && !lifetime && !hasAnyScheduledChange && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="text-sm text-white/50 hover:text-red-400 transition-colors"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Device (구독 활성 상태일 때만 표시) */}
          {(active || pastDue || lifetime) && <ActiveDeviceSection />}

          {/* Account Actions */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
            <div className="space-y-3">
              <button
                onClick={openManageSubscription}
                disabled={!subscription || (canceled && expired)}
                className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-colors ${
                  !subscription || (canceled && expired)
                    ? 'border-white/10 text-white/30 cursor-not-allowed bg-white/[0.02]'
                    : 'border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>Manage Subscription</span>
                {portalLoading ? (
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-between"
              >
                <span>Delete Account</span>
                <svg className="w-5 h-5 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-white/50">
          <Link href="/terms" className="hover:text-white/80 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-white/80 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/refund" className="hover:text-white/80 transition-colors">Refund Policy</Link>
          <span>·</span>
          <a href="mailto:jwjygpt0507@gmail.com" className="hover:text-white/80 transition-colors">Contact Support</a>
        </div>
      </main>

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelConfirm}
      />

      {/* Upgrade Subscription Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onComplete={refetch}
      />

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 max-w-md mx-4 w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-2">Delete Account</h3>
            <p className="text-sm text-gray-400 text-center mb-1">
              This action is <span className="font-semibold text-red-400">permanent and irreversible</span>.
            </p>
            <p className="text-sm text-gray-400 text-center mb-5">
              All your account data and subscription will be permanently deleted. Your local recordings will not be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 rounded-xl border-2 border-gray-700 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
