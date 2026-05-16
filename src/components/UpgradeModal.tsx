'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { PRICE_IDS, openCheckout } from '../lib/paddle'
import { useAuth } from '../contexts/AuthContext'
import type { BillingCycleInterval } from '../types/subscription'

type ChangeMode = 'upgrade' | 'downgrade' | 'lifetime'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  mode?: ChangeMode
  targetPriceId?: string
  targetInterval?: BillingCycleInterval
}

interface PreviewData {
  credit: number
  charge: number
  result: number
}

interface DowngradePreviewData {
  currentPlan: string
  targetPlan: string
  scheduledChange: {
    effectiveAt: string
    newBillingCycleInterval: string
  }
}

interface LifetimePreviewData {
  creditAmount: number
  lifetimePrice: number
  netAmount: number
  discountId: string | null
  currentPlan: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString))
}

// API 응답에서 update_summary의 문자열 금액을 숫자로 파싱
function parseUpgradePreview(data: Record<string, unknown>): PreviewData {
  const summary = data.update_summary as {
    credit: { amount: string }
    charge: { amount: string }
    result: { amount: string }
  }
  return {
    credit: Math.abs(parseInt(summary.credit.amount, 10)),
    charge: parseInt(summary.charge.amount, 10),
    result: parseInt(summary.result.amount, 10),
  }
}

function parseDowngradePreview(data: Record<string, unknown>): DowngradePreviewData {
  const scheduledChange = data.scheduled_change as {
    effective_at: string
    new_billing_cycle_interval: string
  }
  return {
    currentPlan: data.current_plan as string,
    targetPlan: data.target_plan as string,
    scheduledChange: {
      effectiveAt: scheduledChange.effective_at,
      newBillingCycleInterval: scheduledChange.new_billing_cycle_interval,
    },
  }
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onComplete,
  mode = 'upgrade',
  targetPriceId,
  targetInterval,
}: UpgradeModalProps) {
  const { user } = useAuth()
  const [upgradePreview, setUpgradePreview] = useState<PreviewData | null>(null)
  const [downgradePreview, setDowngradePreview] = useState<DowngradePreviewData | null>(null)
  const [lifetimePreview, setLifetimePreview] = useState<LifetimePreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDowngrade = mode === 'downgrade'
  const isLifetime = mode === 'lifetime'
  const priceId = targetPriceId ?? (isLifetime ? PRICE_IDS.lifetime : isDowngrade ? PRICE_IDS.monthly : PRICE_IDS.yearly)
  const interval = targetInterval ?? (isDowngrade ? 'month' : 'year')

  // Preview 호출 (모달 열릴 때)
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function loadPreview() {
      await Promise.resolve()
      if (cancelled) return

      setUpgradePreview(null)
      setDowngradePreview(null)
      setLifetimePreview(null)
      setError(null)
      setLoading(true)

      const body = isLifetime
        ? { action: 'preview_lifetime', price_id: PRICE_IDS.lifetime }
        : { action: 'preview', price_id: priceId, target_interval: interval }

      try {
        const { data, error: err } = await supabase.functions.invoke('upgrade-subscription', { body })
        if (cancelled) return
        console.log('[UpgradeModal] preview response:', { data, error: err })
        if (err || !data) {
          setError(err?.message || 'Failed to load details.')
        } else if (isLifetime) {
          setLifetimePreview({
            creditAmount: data.credit_amount,
            lifetimePrice: data.lifetime_price,
            netAmount: data.net_amount,
            discountId: data.discount_id ?? null,
            currentPlan: data.current_plan,
          })
        } else if (isDowngrade) {
          setDowngradePreview(parseDowngradePreview(data))
        } else {
          setUpgradePreview(parseUpgradePreview(data))
        }
      } catch {
        if (!cancelled) setError('Failed to load details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPreview()

    return () => {
      cancelled = true
    }
  }, [isOpen, priceId, interval, isDowngrade, isLifetime])

  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)
    try {
      if (isLifetime && lifetimePreview) {
        // Lifetime: Paddle checkout 열기 (discount 적용)
        await openCheckout({
          priceId: PRICE_IDS.lifetime,
          userEmail: user?.email,
          userId: user?.id,
          discountId: lifetimePreview.discountId ?? undefined,
        })
        onClose()
        return
      }

      const { error: err } = await supabase.functions.invoke(
        'upgrade-subscription',
        {
          body: {
            action: 'confirm',
            price_id: priceId,
            target_interval: interval,
          },
        }
      )
      if (err) {
        setError(err.message || 'Failed. Please try again.')
        return
      }
      // webhook이 DB를 갱신할 시간을 확보한 뒤 refetch
      await new Promise((r) => setTimeout(r, 2000))
      onComplete()
      onClose()
    } catch {
      setError('Failed. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  if (!isOpen) return null

  const hasPreview = isLifetime ? !!lifetimePreview : isDowngrade ? !!downgradePreview : !!upgradePreview

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            {isLifetime ? 'Upgrade to Lifetime' : isDowngrade ? 'Switch to Monthly' : 'Upgrade to Yearly'}
          </h2>
          <p className="text-gray-400 mt-1">
            {isLifetime
              ? 'Pay once, use forever'
              : isDowngrade
              ? 'Your plan will change after the current billing period'
              : 'Save more with an annual subscription'}
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 mt-3">
                {isDowngrade ? 'Loading plan details...' : 'Calculating your upgrade price\u2026'}
              </p>
            </div>
          ) : error && !hasPreview ? (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : isDowngrade && downgradePreview ? (
            <>
              <div className="space-y-4 mb-6">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-amber-400">Scheduled Change</span>
                  </div>
                  <p className="text-sm text-amber-400/70">
                    Your yearly subscription will remain active until{' '}
                    <span className="font-semibold text-amber-400">
                      {formatDate(downgradePreview.scheduledChange.effectiveAt)}
                    </span>.
                  </p>
                  <p className="text-sm text-amber-400/70 mt-1">
                    After that date, you&apos;ll be billed <span className="font-semibold text-amber-400">$21/month</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">Current plan</span>
                    <span className="font-medium text-white">Yearly ($96/year)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">New plan</span>
                    <span className="font-medium text-white">Monthly ($21/month)</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400 text-sm">Effective date</span>
                    <span className="font-medium text-white">
                      {formatDate(downgradePreview.scheduledChange.effectiveAt)}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          ) : isLifetime && lifetimePreview ? (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400">Lifetime plan</span>
                  <span className="font-medium text-white">{formatCents(lifetimePreview.lifetimePrice)}</span>
                </div>
                {lifetimePreview.creditAmount > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-800">
                    <span className="text-gray-400">Remaining credit ({lifetimePreview.currentPlan === 'year' ? 'yearly' : 'monthly'})</span>
                    <span className="font-medium text-green-400">-{formatCents(lifetimePreview.creditAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="font-semibold text-white">Amount due today</span>
                  <span className="text-lg font-bold text-primary-400">{formatCents(lifetimePreview.netAmount)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          ) : upgradePreview ? (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400">Yearly plan</span>
                  <span className="font-medium text-white">{formatCents(upgradePreview.charge)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400">Remaining credit</span>
                  <span className="font-medium text-green-400">-{formatCents(upgradePreview.credit)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="font-semibold text-white">Amount due today</span>
                  <span className="text-lg font-bold text-primary-400">{formatCents(upgradePreview.result)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          ) : null}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-300 font-medium rounded-xl border-2 border-gray-700 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasPreview || confirming}
              className={`flex-1 px-4 py-3 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isDowngrade
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30'
              }`}
            >
              {confirming ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>{isDowngrade ? 'Switching...' : 'Upgrading...'}</span>
                </div>
              ) : isLifetime ? (
                'Upgrade to Lifetime'
              ) : isDowngrade ? (
                'Switch to Monthly'
              ) : (
                'Upgrade'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
