'use client'

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "../../contexts/AuthContext"
import {
  getPaddle,
  openCheckout,
  setOnCheckoutComplete,
  PRICE_IDS,
} from "../../lib/paddle"
import { useSubscription } from "../../hooks/useSubscription"
import { isActive, isPastDue, isCanceled, isExpired } from "../../types/subscription"
import { redirectToApp } from "../../lib/deeplink"
import { supabase } from "../../lib/supabase"
import { analytics } from "../../lib/analytics"
import UpgradeModal from "../../components/UpgradeModal"
import Header from "../../components/Header"
import Footer from "../../components/Footer"

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: 21,
    period: "/month",
    description: "Perfect for trying out Clipa",
    priceId: PRICE_IDS.monthly,
    popular: true,
    features: [
      "Unlimited recordings",
      "Auto cursor zoom & smart editing",
      "AI upscale up to 4K",
      "10+ styling presets",
      "YouTube, TikTok, Instagram export",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 8,
    period: "/month",
    billedAs: "Billed $96/year",
    description: "Best value for regular users",
    priceId: PRICE_IDS.yearly,
    savings: "Save 62%",
    features: [
      "Everything in Monthly",
      "Auto cursor zoom & smart editing",
      "AI upscale up to 4K",
      "10+ styling presets",
      "YouTube, TikTok, Instagram export",
      "2 months free",
    ],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    price: 240,
    period: "one-time",
    description: "Pay once, use forever",
    priceId: PRICE_IDS.lifetime,
    features: [
      "Everything in Yearly",
      "Auto cursor zoom & smart editing",
      "AI upscale up to 4K",
      "10+ styling presets",
      "YouTube, TikTok, Instagram export",
      "All future updates included",
      "No recurring fees, ever",
    ],
  },
]

export default function PricingClient() {
  const { user } = useAuth()
  const { subscription, loading: subLoading, refetch } = useSubscription()
  const [loading, setLoading] = useState<string | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false)
  const [lifetimeModalOpen, setLifetimeModalOpen] = useState(false)
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null)
  const [lastPlanId, setLastPlanId] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [cancelDowngradeModalOpen, setCancelDowngradeModalOpen] =
    useState(false)
  const [cancelingDowngrade, setCancelingDowngrade] = useState(false)
  const [reactivateLoading, setReactivateLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const from = searchParams.get("from")
  const state = searchParams.get("state") || ""

  useEffect(() => {
    getPaddle()
  }, [])

  // 체크아웃 완료 콜백 등록
  useEffect(() => {
    setOnCheckoutComplete(async () => {
      analytics.purchaseComplete(lastPlanId || "unknown")
      setShowCompleteModal(true)

      await new Promise((r) => setTimeout(r, 3000))
      setShowCompleteModal(false)

      if ((from === "app" || from === "app-dev") && user) {
        const { data } = await supabase.auth.refreshSession()
        if (data.session) {
          try {
            await redirectToApp(data.session, state)
            return
          } catch (e) {
            console.error("Failed to redirect to app:", e)
          }
        }
      }
      router.push("/mypage?fromCheckout=true")
    })
  }, [from, state, router, user, lastPlanId])

  // 로그인 후 pending checkout 자동 실행
  useEffect(() => {
    if (!user || !pendingPriceId) return

    let cancelled = false

    async function continuePendingCheckout() {
      await Promise.resolve()
      if (cancelled || !user || !pendingPriceId) return

      await openCheckout({
        priceId: pendingPriceId,
        userEmail: user.email,
        userId: user.id,
      })
      if (cancelled) return
      setPendingPriceId(null)
      setLoading(null)
    }

    continuePendingCheckout()

    return () => {
      cancelled = true
    }
  }, [user, pendingPriceId])

  const handlePurchase = async (priceId: string, planId: string) => {
    setLoading(planId)
    setLastPlanId(planId)

    if (!user) {
      // 비로그인 → 로그인 페이지로 이동, 결제할 priceId 저장
      setPendingPriceId(priceId)
      router.push("/login?from=pricing")
      setLoading(null)
      return
    }

    await openCheckout({
      priceId,
      userEmail: user.email,
      userId: user.id,
    })
    setLoading(null)
  }

  const handleCancelDowngrade = async () => {
    setCancelingDowngrade(true)
    try {
      const { error: err } = await supabase.functions.invoke(
        "upgrade-subscription",
        {
          body: { action: "cancel_downgrade" },
        }
      )
      if (err) {
        console.error("Failed to cancel downgrade:", err)
        return
      }
      await new Promise((r) => setTimeout(r, 2000))
      refetch()
      setCancelDowngradeModalOpen(false)
    } catch (err) {
      console.error("Failed to cancel downgrade:", err)
    } finally {
      setCancelingDowngrade(false)
    }
  }

  const handleReactivate = async () => {
    setReactivateLoading(true)
    try {
      const { error } = await supabase.functions.invoke(
        "reactivate-subscription",
        { body: {} }
      )
      if (error) {
        console.error("Failed to reactivate subscription:", error)
        alert("Failed to reactivate subscription. Please try again.")
        return
      }
      await new Promise((r) => setTimeout(r, 2000))
      refetch()
    } catch (err) {
      console.error("Failed to reactivate subscription:", err)
      alert("Failed to reactivate subscription. Please try again.")
    } finally {
      setReactivateLoading(false)
    }
  }

  const alreadySubscribed = isActive(subscription)
  const pastDue = isPastDue(subscription)
  const currentPriceId = alreadySubscribed ? subscription?.price_id : null
  const isLifetimePlan = currentPriceId === PRICE_IDS.lifetime
  const isMonthly =
    alreadySubscribed && subscription?.billing_cycle_interval === "month"
  const isYearly =
    alreadySubscribed &&
    subscription?.billing_cycle_interval === "year" &&
    !isLifetimePlan
  const hasScheduledDowngrade = !!(
    subscription?.scheduled_change_effective_at &&
    new Date(subscription.scheduled_change_effective_at) > new Date() &&
    subscription.scheduled_change_billing_cycle_interval === "month"
  )
  const canceled = isCanceled(subscription)
  const expired = isExpired(subscription)
  const canceledNotExpired = canceled && !expired
  const hasScheduledCancel = !!(
    subscription?.scheduled_change_effective_at &&
    new Date(subscription.scheduled_change_effective_at) > new Date() &&
    !subscription.scheduled_change_billing_cycle_interval
  )

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0C14]">
      <Header />

      {/* Decorative background — warm, layered ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top-center hero glow — warm purple/pink, large and diffused */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-b from-purple-500/[0.12] via-fuchsia-500/[0.06] to-transparent blur-[120px]" />
        {/* Right accent — subtle warm blue */}
        <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-indigo-500/[0.08] via-violet-500/[0.04] to-transparent blur-[100px]" />
        {/* Bottom-left accent — warm pink */}
        <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[400px] rounded-full bg-gradient-to-tr from-rose-500/[0.07] via-pink-500/[0.04] to-transparent blur-[100px]" />
        {/* Subtle noise texture overlay for depth */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      </div>

      {/* Content */}
      <main className="relative z-10 section-glow max-w-7xl mx-auto px-6 pt-24 sm:pt-32 pb-[80px] md:pb-[160px] flex-grow w-full">
        {/* Header — more presence, warmer subtitle */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="heading-lg font-bold text-white mb-5 animate-on-load delay-1">
            Simple, <span className="gradient-text">transparent</span> pricing
          </h1>
          <p className="text-base sm:text-lg text-white/40 max-w-md mx-auto animate-on-load delay-2 leading-relaxed">
            Monthly, yearly, or forever —
            <br className="hidden sm:block" />
            start the way that works for you.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => {
            const isPopular = plan.popular

            return (
            <div
              key={plan.id}
              className={`animate-on-load delay-${i + 2} relative flex flex-col rounded-2xl transition-all duration-300 ${
                isPopular
                  ? ""
                  : ""
              }`}
            >
              {/* Gradient border wrapper for popular card */}
              {isPopular && (
                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-purple-400/60 via-purple-500/20 to-fuchsia-500/30 blur-[0.5px]" />
              )}

              <div
                className={`relative flex flex-col h-full p-6 lg:p-8 rounded-2xl border transition-all duration-300 ${
                  isPopular
                    ? "bg-gradient-to-b from-[#1C1C28] via-[#1C1C28] to-[#1C1C28] border-transparent shadow-[0_0_60px_-12px_rgba(168,85,247,0.25),0_0_20px_-5px_rgba(168,85,247,0.15)]"
                    : "bg-gradient-to-b from-[#14141E]/90 to-[#14141E]/90 border-white/[0.07] hover:border-white/[0.14] hover:shadow-[0_8px_40px_-12px_rgba(168,85,247,0.1)]"
                }`}
                style={isPopular ? {} : { backdropFilter: 'blur(20px)' }}
              >
                {/* Inner top highlight for glass effect */}
                <div className={`absolute inset-x-0 top-0 h-px rounded-t-2xl ${isPopular ? 'bg-gradient-to-r from-transparent via-purple-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-white/[0.08] to-transparent'}`} />

                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="text-[11px] font-bold text-white px-5 py-1.5 rounded-full tracking-widest uppercase shadow-[0_4px_16px_-2px_rgba(168,85,247,0.5)]" style={{ background: 'linear-gradient(135deg, #9333EA 0%, #A855F7 40%, #EC4899 100%)' }}>
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.savings && (
                  <div className="absolute top-5 right-5">
                    <span className="bg-emerald-500/[0.08] text-emerald-400 text-[11px] font-semibold px-3 py-1 rounded-full border border-emerald-500/20">
                      {plan.savings}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-base font-semibold text-white/90 mb-1 tracking-wide">
                    {plan.name}
                  </h2>
                  <p className="text-white/35 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-[44px] lg:text-[52px] font-extrabold tracking-tighter leading-none ${isPopular ? 'gradient-text' : 'text-white'}`}>
                      ${plan.price}
                    </span>
                    <span className="text-white/30 text-sm font-medium">{plan.period}</span>
                  </div>
                  {plan.billedAs && (
                    <p className="text-[13px] text-white/30 mt-2">{plan.billedAs}</p>
                  )}
                </div>

                <div className={`h-px mb-6 ${isPopular ? 'bg-gradient-to-r from-transparent via-purple-500/20 to-transparent' : 'bg-gradient-to-r from-transparent via-white/[0.06] to-transparent'}`} />

                <ul className="space-y-3.5 mb-8 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li
                      key={index}
                      className={`flex items-center gap-3 text-sm ${isPopular ? 'text-white/70' : 'text-white/50'}`}
                    >
                      <div className={`w-4.5 h-4.5 flex-shrink-0 flex items-center justify-center rounded-full ${isPopular ? 'bg-purple-500/15' : 'bg-white/[0.04]'}`}>
                        <svg
                          className={`w-3 h-3 ${isPopular ? 'text-purple-300' : 'text-white/40'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {user && subLoading ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl font-medium bg-white/[0.03] text-white/30 cursor-default"
                  >
                    &nbsp;
                  </button>
                ) : pastDue ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-not-allowed"
                  >
                    Update Payment Method
                  </button>
                ) : (canceledNotExpired || hasScheduledCancel) &&
                  subscription?.price_id === plan.priceId ? (
                  <button
                    onClick={handleReactivate}
                    disabled={reactivateLoading}
                    className="btn-block w-full disabled:opacity-50"
                  >
                    {reactivateLoading ? "Resubscribing..." : "Resubscribe"}
                  </button>
                ) : currentPriceId === plan.priceId ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl font-medium bg-white/[0.03] text-white/30 cursor-default border border-white/[0.06]"
                  >
                    Current Plan
                  </button>
                ) : isLifetimePlan && plan.id !== "lifetime" ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 rounded-xl font-medium bg-white/[0.03] text-white/25 cursor-not-allowed"
                  >
                    Lifetime Active
                  </button>
                ) : (isMonthly || isYearly) && plan.id === "lifetime" ? (
                  <button
                    onClick={() => setLifetimeModalOpen(true)}
                    className="btn-block w-full"
                  >
                    Upgrade
                  </button>
                ) : isMonthly && plan.id === "yearly" ? (
                  <button
                    onClick={() => setUpgradeModalOpen(true)}
                    className="btn-block w-full"
                  >
                    Upgrade
                  </button>
                ) : isYearly && plan.id === "monthly" && hasScheduledDowngrade ? (
                  <button
                    onClick={() => setCancelDowngradeModalOpen(true)}
                    className="w-full py-3.5 px-4 rounded-xl font-medium bg-white/[0.03] text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/[0.06]"
                  >
                    Switching Soon
                  </button>
                ) : isYearly && plan.id === "monthly" ? (
                  <button
                    onClick={() => setDowngradeModalOpen(true)}
                    className="btn-block-ghost w-full"
                  >
                    Switch to Monthly
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(plan.priceId, plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full disabled:opacity-50 ${
                      isPopular
                        ? "btn-block"
                        : "btn-block-ghost"
                    }`}
                  >
                    {loading === plan.id
                      ? "Loading..."
                      : alreadySubscribed
                      ? "Upgrade"
                      : "Get Started"}
                  </button>
                )}
              </div>
            </div>
            )
          })}
        </div>

        {/* Trust badges — multiple signals */}
        <div className="mt-16 sm:mt-24 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-6 text-white/30 text-[13px]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Secure payment via Paddle
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              256-bit SSL encrypted
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* 결제 완료 모달 */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h3>
            <p className="text-gray-500 text-sm">
              Thank you for subscribing to Clipa. Redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Cancel Downgrade Modal */}
      {cancelDowngradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 w-full shadow-xl">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              Cancel Scheduled Switch?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-5">
              Your plan is scheduled to switch to monthly. Would you like to
              cancel this and keep your yearly subscription?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelDowngradeModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Keep Switch
              </button>
              <button
                onClick={handleCancelDowngrade}
                disabled={cancelingDowngrade}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50"
              >
                {cancelingDowngrade ? "Canceling..." : "Stay on Yearly"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal (Monthly → Yearly) */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onComplete={() => router.push("/mypage?fromCheckout=true")}
        mode="upgrade"
        targetPriceId={PRICE_IDS.yearly}
        targetInterval="year"
      />

      {/* Downgrade Modal (Yearly → Monthly) */}
      <UpgradeModal
        isOpen={downgradeModalOpen}
        onClose={() => setDowngradeModalOpen(false)}
        onComplete={() => router.push("/mypage?fromCheckout=true")}
        mode="downgrade"
        targetPriceId={PRICE_IDS.monthly}
        targetInterval="month"
      />

      {/* Lifetime Upgrade Modal */}
      <UpgradeModal
        isOpen={lifetimeModalOpen}
        onClose={() => setLifetimeModalOpen(false)}
        onComplete={() => router.push("/mypage?fromCheckout=true")}
        mode="lifetime"
        targetPriceId={PRICE_IDS.lifetime}
      />
    </div>
  )
}
