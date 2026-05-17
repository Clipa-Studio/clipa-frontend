'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  adminFetch,
  adminMutate,
  type AdminContentRow,
  type AdminDeviceRow,
  type AdminEventAnalyticsResponse,
  type AdminEventsCursor,
  type AdminEventRow,
  type AdminEventsResponse,
  type AdminProfileRow,
  type AdminSubscriptionRow,
} from './adminApi'
import {
  AdminButton,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatusPill,
  formatDate,
  formatDateTime,
} from './AdminPrimitives'
import { getBlogPostHref } from '../../../lib/blogCategories'

const PUBLIC_SITE_URL = 'https://www.clipa.studio'

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-white/40">
        {label}
      </td>
    </tr>
  )
}

function roleTone(role: string) {
  return role === 'admin' ? 'purple' : 'neutral'
}

function roleLabel(role: string) {
  if (role === 'admin') return '관리자'
  if (role === 'user') return '사용자'
  return role
}

function statusTone(status: string) {
  if (status === 'active') return 'green'
  if (status === 'past_due') return 'yellow'
  if (status === 'canceled') return 'red'
  return 'neutral'
}

function publishedTone(published: boolean) {
  return published ? 'green' : 'yellow'
}

function subscriptionStatusLabel(status: string) {
  if (status === 'active') return '활성'
  if (status === 'past_due') return '결제 지연'
  if (status === 'canceled') return '해지'
  return status
}

function billingCycleLabel(cycle: string | null | undefined) {
  if (cycle === 'month') return '월간'
  if (cycle === 'year') return '연간'
  return cycle ?? ''
}

function isManualSubscription(subscription: AdminSubscriptionRow) {
  return subscription.product_id === 'manual' || subscription.price_id === 'manual' || subscription.paddle_customer_id.startsWith('manual-')
}

function subscriptionPlanLabel(subscription: AdminSubscriptionRow) {
  if (subscription.type === 'limitless') {
    return isManualSubscription(subscription) ? '영구 이용권 · 수동' : '영구 이용권'
  }

  if (isManualSubscription(subscription)) return '구독 · 수동'
  return `구독${subscription.billing_cycle_interval ? ` · ${billingCycleLabel(subscription.billing_cycle_interval)}` : ''}`
}

function canRevokeSubscription(subscription: AdminSubscriptionRow) {
  return subscription.status === 'active' || subscription.status === 'past_due'
}

function publishedLabel(published: boolean) {
  return published ? '게시됨' : '초안'
}

function environmentLabel(environment: string | null | undefined) {
  if (environment === 'prod') return 'Prod'
  if (environment === 'dev') return 'Dev'
  if (environment === 'all') return '전체'
  return '알 수 없음'
}

type EnvironmentFilterValue = 'prod' | 'dev' | 'all'

const environmentFilterOptions: Array<{ value: EnvironmentFilterValue; label: string }> = [
  { value: 'prod', label: 'Prod' },
  { value: 'dev', label: 'Dev' },
  { value: 'all', label: '전체' },
]

function EnvironmentToggle({
  value,
  onChange,
}: {
  value: EnvironmentFilterValue
  onChange: (value: EnvironmentFilterValue) => void
}) {
  return (
    <div>
      <span className="text-xs font-medium text-white/45">환경</span>
      <div className="mt-1 inline-flex w-full rounded-lg border border-white/10 bg-[#0C0C14] p-1" role="group" aria-label="환경">
        {environmentFilterOptions.map((option) => {
          const active = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`h-8 flex-1 rounded-md px-3 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-white text-[#0C0C14]'
                  : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function windowLabel(value: string) {
  if (value === '1') return '최근 24시간'
  if (value === '7') return '최근 7일'
  if (value === '30') return '최근 30일'
  return '최근 7일'
}

function funnelStepLabel(label: string) {
  const labels: Record<string, string> = {
    'App opened': '앱 실행',
    'Record started': '녹화 시작',
    'Record completed': '녹화 완료',
    'Editor opened': '에디터 열림',
    'Thumbnail opened': '썸네일 편집 열림',
    'Thumbnail first changed': '썸네일 첫 변경',
    'Effect changed': '효과 변경',
    'Export opened': '내보내기 열림',
    'Export clicked': '내보내기 클릭',
    'Export completed': '내보내기 완료',
    'Export Editor': '내보내기 에디터',
  }
  return labels[label] ?? label
}

function eventDisplayName(eventName: string) {
  const names: Record<string, string> = {
    'app.opened': '앱 실행',
    'record.started': '녹화 시작',
    'record.completed': '녹화 완료',
    'record.error': '녹화 오류',
    'record.failed': '녹화 실패',
    'editor.opened': '에디터 열림',
    'editor.thumbnail_opened': '썸네일 편집 열림',
    'editor.thumbnail_changed': '썸네일 변경',
    'editor.thumbnail_closed': '썸네일 편집 닫힘',
    'editor.effect_changed': '효과 변경',
    'editor.error': '에디터 오류',
    'export.opened': '내보내기 열림',
    'export.clicked': '내보내기 클릭',
    'export.completed': '내보내기 완료',
    'export.error': '내보내기 오류',
    'export.failed': '내보내기 실패',
    'export.blocked': '내보내기 차단',
    'Export Editor': '내보내기 에디터',
  }
  return names[eventName] ?? eventName
}

function formatAttributes(attributes: Record<string, unknown> | null | undefined) {
  return JSON.stringify(attributes ?? {}, null, 2)
}

const EVENTS_PAGE_SIZE = 50
const numberFormatter = new Intl.NumberFormat('ko-KR')

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function combineDateTimeInput(date: string) {
  if (!date) return ''
  return `${date}T23:59`
}

function ratio(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0
}

function conversionRate(current: number, previous: number) {
  if (previous <= 0) return 0
  return Math.min(100, ratio(current, previous))
}

export function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([])
  const [devices, setDevices] = useState<AdminDeviceRow[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      adminFetch<{ profiles: AdminProfileRow[] }>('profiles'),
      adminFetch<{ subscriptions: AdminSubscriptionRow[] }>('subscriptions'),
      adminFetch<{ devices: AdminDeviceRow[] }>('devices'),
    ])
      .then(([profileData, subscriptionData, deviceData]) => {
        if (cancelled) return
        setProfiles(profileData.profiles)
        setSubscriptions(subscriptionData.subscriptions)
        setDevices(deviceData.devices)
        setSelectedProfileId((current) => current ?? profileData.profiles[0]?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '프로필을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="프로필을 불러오는 중..." />
  if (error) return <ErrorState message={error} />

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null
  const selectedSubscriptions = selectedProfile
    ? subscriptions.filter((subscription) => subscription.user_id === selectedProfile.id)
    : []
  const selectedDevices = selectedProfile
    ? devices.filter((device) => device.user_id === selectedProfile.id)
    : []
  const latestSubscription = selectedSubscriptions[0] ?? null

  return (
    <>
      <PageHeader
        title="프로필"
        description="Supabase Auth와 동기화된 사용자 프로필과 관리자 권한 상태를 확인합니다."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title={`프로필 ${profiles.length}개`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
                <tr>
                  <th className="px-4 py-3 font-medium">사용자</th>
                  <th className="px-4 py-3 font-medium">권한</th>
                  <th className="px-4 py-3 font-medium">생성일</th>
                  <th className="px-4 py-3 font-medium">수정일</th>
                  <th className="px-4 py-3 font-medium">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {profiles.length === 0 ? (
                  <EmptyRow colSpan={5} label="프로필이 없습니다." />
                ) : profiles.map((profile) => {
                  const selected = selectedProfile?.id === profile.id

                  return (
                    <tr
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`cursor-pointer transition-colors ${
                        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white/85">{profile.display_name || profile.email || '이름 없는 사용자'}</p>
                        <p className="mt-1 text-xs text-white/40">{profile.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3"><StatusPill tone={roleTone(profile.role)}>{roleLabel(profile.role)}</StatusPill></td>
                      <td className="px-4 py-3 text-white/55">{formatDateTime(profile.created_at)}</td>
                      <td className="px-4 py-3 text-white/55">{formatDateTime(profile.updated_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/35">{profile.id}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="프로필 상세"
          action={selectedProfile ? (
            <button
              type="button"
              onClick={() => setSelectedProfileId(null)}
              className="text-xs font-semibold text-white/45 transition-colors hover:text-white/75"
            >
              닫기
            </button>
          ) : null}
        >
          {selectedProfile ? (
            <div className="space-y-5 p-4">
              <div>
                <div className="flex items-start gap-3">
                  {selectedProfile.avatar_url ? (
                    <img src={selectedProfile.avatar_url} alt="" className="h-11 w-11 rounded-full border border-white/10 object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/60">
                      {(selectedProfile.display_name || selectedProfile.email || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/85">{selectedProfile.display_name || '이름 없는 사용자'}</p>
                    <p className="mt-1 truncate text-xs text-white/45">{selectedProfile.email || '-'}</p>
                    <div className="mt-2"><StatusPill tone={roleTone(selectedProfile.role)}>{roleLabel(selectedProfile.role)}</StatusPill></div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-xs font-medium text-white/35">사용자 ID</p>
                  <p className="mt-2 break-all font-mono text-xs text-white/65">{selectedProfile.id}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-xs font-medium text-white/35">가입일</p>
                    <p className="mt-2 text-xs text-white/65">{formatDateTime(selectedProfile.created_at)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-xs font-medium text-white/35">수정일</p>
                    <p className="mt-2 text-xs text-white/65">{formatDateTime(selectedProfile.updated_at)}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/75">구독</h3>
                  <span className="text-xs text-white/35">{selectedSubscriptions.length}개</span>
                </div>
                {latestSubscription ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white/80">{subscriptionPlanLabel(latestSubscription)}</p>
                      <StatusPill tone={statusTone(latestSubscription.status)}>{subscriptionStatusLabel(latestSubscription.status)}</StatusPill>
                    </div>
                    <p className="mt-2 text-xs text-white/45">
                      {formatDate(latestSubscription.subscription_period_start)} → {formatDate(latestSubscription.subscription_period_end)}
                    </p>
                    <p className="mt-2 text-xs text-white/35">{isManualSubscription(latestSubscription) ? '수동 부여' : latestSubscription.paddle_customer_id}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/40">구독 기록이 없습니다.</div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/75">디바이스</h3>
                  <span className="text-xs text-white/35">{selectedDevices.length}대</span>
                </div>
                <div className="space-y-2">
                  {selectedDevices.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/40">활성 디바이스가 없습니다.</div>
                  ) : selectedDevices.map((device) => (
                    <div key={device.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-sm font-medium text-white/75">{device.device_name || '이름 없는 디바이스'}</p>
                      <p className="mt-1 text-xs text-white/40">{formatDateTime(device.activated_at)}</p>
                      <p className="mt-2 break-all font-mono text-[11px] text-white/30">{device.device_token}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-white/45">상세를 보려면 프로필을 선택하세요.</div>
          )}
        </Panel>
      </div>
    </>
  )
}

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([])
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    user_id: '',
    type: 'subscription' as 'subscription' | 'limitless',
    period_end_date: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subscriptionData, profileData] = await Promise.all([
        adminFetch<{ subscriptions: AdminSubscriptionRow[] }>('subscriptions'),
        adminFetch<{ profiles: AdminProfileRow[] }>('profiles'),
      ])
      setSubscriptions(subscriptionData.subscriptions)
      setProfiles(profileData.profiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await adminMutate('subscriptions', 'POST', {
        user_id: form.user_id,
        type: form.type,
        subscription_period_end: form.type === 'subscription'
          ? combineDateTimeInput(form.period_end_date)
          : '',
      })
      setShowForm(false)
      setForm({ user_id: '', type: 'subscription', period_end_date: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 정보를 추가하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const revoke = async (subscription: AdminSubscriptionRow) => {
    const label = subscription.email || subscription.display_name || subscription.user_id
    if (!window.confirm(`${label}의 활성 구독권을 회수할까요?\nPaddle 결제 취소는 별도로 처리해야 합니다.`)) return

    setRevokingUserId(subscription.user_id)
    setError(null)
    try {
      await adminMutate('subscriptions', 'PATCH', { user_id: subscription.user_id })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독권을 회수하지 못했습니다.')
    } finally {
      setRevokingUserId(null)
    }
  }

  const setRelativePeriodEnd = (days: number) => {
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + days)
    nextDate.setHours(23, 59, 0, 0)

    setForm((prev) => ({
      ...prev,
      type: 'subscription',
      period_end_date: toDateInputValue(nextDate),
    }))
  }

  if (loading) return <LoadingState label="구독 정보를 불러오는 중..." />

  return (
    <>
      <PageHeader
        title="구독"
        description="현재 구독 상태를 확인하고 지원 처리를 위해 수동 구독권을 부여하거나 회수합니다."
        action={<AdminButton onClick={() => setShowForm((value) => !value)}>{showForm ? '폼 닫기' : '구독권 부여'}</AdminButton>}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {showForm && (
        <Panel title="구독권 부여">
          <form onSubmit={handleSubmit} className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="md:col-span-2">
              <span className="text-xs font-medium text-white/45">사용자</span>
              <input
                required
                list="admin-subscription-users"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                placeholder="사용자 ID 또는 이메일로 선택"
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
              <datalist id="admin-subscription-users">
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.email || profile.display_name || profile.id}
                  </option>
                ))}
              </datalist>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">권한 유형</span>
              <select
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as 'subscription' | 'limitless'
                  setForm((prev) => ({
                    ...prev,
                    type,
                    period_end_date: type === 'limitless' ? '' : prev.period_end_date,
                  }))
                }}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="subscription">구독</option>
                <option value="limitless">영구 이용권</option>
              </select>
            </label>
            <div className="md:col-span-2 xl:col-span-1">
              <span className="text-xs font-medium text-white/45">구독 종료일</span>
              <input
                type="date"
                required={form.type === 'subscription'}
                disabled={form.type === 'limitless'}
                value={form.period_end_date}
                onChange={(e) => setForm({ ...form, period_end_date: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
              />
              {form.type === 'subscription' ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    { label: '7일', days: 7 },
                    { label: '30일', days: 30 },
                    { label: '90일', days: 90 },
                    { label: '1년', days: 365 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setRelativePeriodEnd(option.days)}
                      className="h-7 rounded-md border border-white/10 px-2.5 text-xs font-semibold text-white/60 transition-colors hover:border-white/20 hover:text-white"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/35">영구 이용권은 종료일을 사용하지 않습니다.</p>
              )}
            </div>
            <div className="flex items-end">
              <AdminButton type="submit" disabled={submitting}>{submitting ? '부여 중...' : '권한 부여'}</AdminButton>
            </div>
          </form>
        </Panel>
      )}

      <Panel title={`구독 기록 ${subscriptions.length}개`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">플랜</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">출처</th>
                <th className="px-4 py-3 font-medium">현재 기간</th>
                <th className="px-4 py-3 font-medium">다음 결제</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {subscriptions.length === 0 ? (
                <EmptyRow colSpan={7} label="구독 기록이 없습니다." />
              ) : subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{subscription.email || subscription.display_name || subscription.user_id}</p>
                    <p className="mt-1 font-mono text-xs text-white/35">{subscription.user_id}</p>
                  </td>
                  <td className="px-4 py-3 text-white/65">{subscriptionPlanLabel(subscription)}</td>
                  <td className="px-4 py-3"><StatusPill tone={statusTone(subscription.status)}>{subscriptionStatusLabel(subscription.status)}</StatusPill></td>
                  <td className="px-4 py-3 text-white/50">{isManualSubscription(subscription) ? '수동' : subscription.paddle_customer_id}</td>
                  <td className="px-4 py-3 text-white/50">{formatDate(subscription.subscription_period_start)} → {formatDate(subscription.subscription_period_end)}</td>
                  <td className="px-4 py-3 text-white/50">{formatDate(subscription.next_billed_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {canRevokeSubscription(subscription) ? (
                      <AdminButton variant="danger" onClick={() => revoke(subscription)} disabled={revokingUserId === subscription.user_id}>
                        {revokingUserId === subscription.user_id ? '회수 중...' : '회수'}
                      </AdminButton>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

export function AdminDevicesPage() {
  const [devices, setDevices] = useState<AdminDeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetch<{ devices: AdminDeviceRow[] }>('devices')
      setDevices(data.devices)
    } catch (err) {
      setError(err instanceof Error ? err.message : '디바이스 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const deactivate = async (device: AdminDeviceRow) => {
    if (!window.confirm(`${device.device_name || '이 디바이스'}를 비활성화할까요?`)) return
    setBusyId(device.id)
    setError(null)
    try {
      await adminMutate('devices', 'DELETE', { id: device.id })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '디바이스를 비활성화하지 못했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="디바이스 정보를 불러오는 중..." />

  return (
    <>
      <PageHeader title="디바이스" description="활성화된 데스크톱 디바이스를 확인하고 사용자별 디바이스 토큰을 비활성화합니다." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <Panel title={`활성 디바이스 ${devices.length}대`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">디바이스</th>
                <th className="px-4 py-3 font-medium">활성화일</th>
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {devices.length === 0 ? (
                <EmptyRow colSpan={5} label="활성 디바이스가 없습니다." />
              ) : devices.map((device) => (
                <tr key={device.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{device.email || device.display_name || device.user_id}</p>
                    <p className="mt-1 font-mono text-xs text-white/35">{device.user_id}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">{device.device_name || '이름 없는 디바이스'}</td>
                  <td className="px-4 py-3 text-white/50">{formatDateTime(device.activated_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/35">{device.device_token}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton variant="danger" onClick={() => deactivate(device)} disabled={busyId === device.id}>
                      {busyId === device.id ? '비활성화 중...' : '비활성화'}
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

function ContentListPage({
  type,
  rows,
  loading,
  error,
}: {
  type: 'blog' | 'changelog'
  rows: AdminContentRow[]
  loading: boolean
  error: string | null
}) {
  const isBlog = type === 'blog'
  const title = isBlog ? '블로그' : 'ChangeLog'
  const createHref = isBlog ? '/admin/blog/new' : '/admin/changelog/new'
  const publicHref = (row: AdminContentRow) => {
    const path = isBlog
      ? getBlogPostHref({ slug: row.slug, category_slug: row.category_slug })
      : `/releases/${row.slug}`

    return `${PUBLIC_SITE_URL}${path}`
  }

  if (loading) return <LoadingState label={`${title}를 불러오는 중...`} />
  if (error) return <ErrorState message={error} />

  return (
    <>
      <PageHeader
        title={title}
        description={isBlog ? '게시된 글과 초안 글을 확인하고 바로 수정합니다.' : '게시된 릴리스 노트와 초안을 확인하고 바로 수정합니다.'}
        action={<AdminButton href={createHref}>새로 만들기</AdminButton>}
      />
      <Panel title={`항목 ${rows.length}개`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">{isBlog ? '카테고리' : '버전'}</th>
                <th className="px-4 py-3 font-medium">수정일</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.length === 0 ? (
                <EmptyRow colSpan={5} label={`${title} 항목이 없습니다.`} />
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    {row.published ? (
                      <a
                        href={publicHref(row)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-white/85 transition-colors hover:text-white"
                      >
                        {row.title}
                      </a>
                    ) : (
                      <p className="font-medium text-white/85">{row.title}</p>
                    )}
                    <p className="mt-1 text-xs text-white/35">
                      {row.published ? '공개 페이지 새창' : '초안'}
                      {' · '}
                      /{row.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3"><StatusPill tone={publishedTone(row.published)}>{publishedLabel(row.published)}</StatusPill></td>
                  <td className="px-4 py-3 text-white/55">{isBlog ? row.category_slug || '-' : row.version || '-'}</td>
                  <td className="px-4 py-3 text-white/50">{formatDateTime(row.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton href={isBlog ? `/admin/blog/${row.id}/edit` : `/admin/changelog/${row.slug}/edit`} variant="secondary">
                      수정
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

export function AdminBlogPage() {
  const [rows, setRows] = useState<AdminContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<{ posts: AdminContentRow[] }>('blog')
      .then((data) => setRows(data.posts))
      .catch((err) => setError(err instanceof Error ? err.message : '블로그 글을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return <ContentListPage type="blog" rows={rows} loading={loading} error={error} />
}

export function AdminChangelogPage() {
  const [rows, setRows] = useState<AdminContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<{ releases: AdminContentRow[] }>('changelog')
      .then((data) => setRows(data.releases))
      .catch((err) => setError(err instanceof Error ? err.message : 'ChangeLog를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return <ContentListPage type="changelog" rows={rows} loading={loading} error={error} />
}

function AnalyticsMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: number | string
  detail?: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-white/45">{detail}</p> : null}
    </div>
  )
}

export function AdminEventAnalyticsPage() {
  const [data, setData] = useState<AdminEventAnalyticsResponse | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentFilterValue>('prod')
  const [since, setSince] = useState('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const params = useMemo(() => ({ environment, since }), [environment, since])

  useEffect(() => {
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      adminFetch<AdminEventAnalyticsResponse>('eventAnalytics', params)
        .then((analytics) => {
          if (!cancelled) setData(analytics)
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : '이벤트 분석을 불러오지 못했습니다.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [params, reloadKey])

  const summary = data?.summary
  const visibleFunnel = data?.funnel
    .map((step, index) => ({ ...step, originalIndex: index }))
    .filter((step) => step.count > 0) ?? []
  const maxBreakdownCount = Math.max(...(data?.breakdown.map((row) => row.count) ?? [0]), 1)
  const maxFunnelCount = Math.max(...visibleFunnel.map((row) => row.count), 1)
  const totalErrors = summary ? summary.recordErrors + summary.editorErrors + summary.exportErrors : 0
  const exportSuccessRate = summary ? ratio(summary.exportCompleted, summary.exportClicked) : 0
  const recordToExportRate = summary ? ratio(summary.exportCompleted, summary.recordStarted) : 0
  const watermarkedExportRate = summary ? ratio(summary.watermarkedExports, summary.exportCompleted) : 0

  return (
    <>
      <PageHeader
        title="이벤트 분석"
        description="제품 이벤트 요약, 단계별 전환률, 실패 신호를 확인합니다."
        action={(
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
              {loading ? '새로고침 중...' : '새로고침'}
            </AdminButton>
            <AdminButton href="/admin/events/logs" variant="secondary">로그 열기</AdminButton>
          </div>
        )}
      />

      <Panel>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <EnvironmentToggle value={environment} onChange={setEnvironment} />
          <label>
            <span className="text-xs font-medium text-white/45">기간</span>
            <select value={since} onChange={(event) => setSince(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="1">최근 24시간</option>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
            </select>
          </label>
          <div className="flex items-end">
            <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/55">
              {loading ? '불러오는 중...' : `${environmentLabel(environment)} · ${windowLabel(since)}`}
            </div>
          </div>
        </div>
      </Panel>

      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {loading && !data ? (
        <div className="mt-4"><LoadingState label="이벤트 분석을 불러오는 중..." /></div>
      ) : data && summary ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <AnalyticsMetric label="전체 이벤트" value={formatNumber(summary.totalEvents)} detail={`클라이언트 ${formatNumber(summary.uniqueClients)}개`} />
            <AnalyticsMetric label="오류 이벤트" value={formatNumber(totalErrors)} detail={`녹화 ${summary.recordErrors}개, 에디터 ${summary.editorErrors}개, 내보내기 ${summary.exportErrors}개`} />
            <AnalyticsMetric label="Export 성공률" value={formatPercent(exportSuccessRate)} detail={`완료 ${summary.exportCompleted}개 / 클릭 ${summary.exportClicked}개`} />
            <AnalyticsMetric label="녹화 → 출력 비율" value={formatPercent(recordToExportRate)} detail={`출력 완료 ${summary.exportCompleted}개 / 녹화 시작 ${summary.recordStarted}개`} />
            <AnalyticsMetric label="워터마크 포함" value={formatPercent(watermarkedExportRate)} detail={`${summary.watermarkedExports}개 / 출력 완료 ${summary.exportCompleted}개`} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <Panel title="이벤트 분포">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
                    <tr>
                      <th className="px-4 py-3 font-medium">이벤트</th>
                      <th className="px-4 py-3 font-medium">건수</th>
                      <th className="px-4 py-3 font-medium">비중</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.breakdown.length === 0 ? (
                      <EmptyRow colSpan={3} label="현재 필터에 맞는 이벤트가 없습니다." />
                    ) : data.breakdown.map((row) => (
                      <tr key={row.eventName} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-white/80">{eventDisplayName(row.eventName)}</td>
                        <td className="px-4 py-3 text-white/55">{formatNumber(row.count)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-full bg-white/70" style={{ width: `${Math.max(4, ratio(row.count, maxBreakdownCount))}%` }} />
                            </div>
                            <span className="text-white/45">{formatPercent(ratio(row.count, summary.totalEvents))}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="단계별 전환률">
              <div className="space-y-3 p-4">
                {visibleFunnel.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.025] px-4 py-10 text-center text-sm text-white/40">
                    현재 필터에 맞는 단계 이벤트가 없습니다.
                  </div>
                ) : visibleFunnel.map((step, index) => {
                  const previous = index === 0 ? step.count : visibleFunnel[index - 1]?.count ?? 0
                  return (
                    <div key={step.eventName}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-white/80">{funnelStepLabel(step.label)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatNumber(step.count)}</p>
                          <p className="mt-1 text-xs text-white/40">{index === 0 ? '시작점' : formatPercent(conversionRate(step.count, previous))}</p>
                        </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-primary-200" style={{ width: `${Math.max(4, ratio(step.count, maxFunnelCount))}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div className="mt-4">
            <Panel title="최근 오류 이벤트">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
                    <tr>
                      <th className="px-4 py-3 font-medium">이벤트</th>
                      <th className="px-4 py-3 font-medium">환경</th>
                      <th className="px-4 py-3 font-medium">버전</th>
                      <th className="px-4 py-3 font-medium">수신 시각</th>
                      <th className="px-4 py-3 font-medium">속성</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.issues.length === 0 ? (
                      <EmptyRow colSpan={5} label="현재 필터에 맞는 오류 이벤트가 없습니다." />
                    ) : data.issues.map((event) => (
                      <tr key={event.event_id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-white/80">{eventDisplayName(event.event_name)}</td>
                        <td className="px-4 py-3"><StatusPill tone="red">{environmentLabel(event.environment)}</StatusPill></td>
                        <td className="px-4 py-3 text-white/50">{event.app_version || '-'} {event.app_build ? `(${event.app_build})` : ''}</td>
                        <td className="px-4 py-3 text-white/50">{formatDateTime(event.received_at)}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 font-mono text-xs text-white/35">{JSON.stringify(event.attributes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      ) : null}
    </>
  )
}

function EventsPaginationControls({
  page,
  hasPrevious,
  hasNext,
  loading,
  onPrevious,
  onNext,
}: {
  page: number
  hasPrevious: boolean
  hasNext: boolean
  loading: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-white/45">{page}페이지</span>
      <div className="flex gap-2">
        <AdminButton variant="secondary" onClick={onPrevious} disabled={loading || !hasPrevious}>
          이전
        </AdminButton>
        <AdminButton variant="secondary" onClick={onNext} disabled={loading || !hasNext}>
          다음
        </AdminButton>
      </div>
    </div>
  )
}

export function AdminEventLogsPage() {
  const [events, setEvents] = useState<AdminEventRow[]>([])
  const [eventNames, setEventNames] = useState<string[]>([])
  const [hasNextPage, setHasNextPage] = useState(false)
  const [nextCursor, setNextCursor] = useState<AdminEventsCursor | null>(null)
  const [currentCursor, setCurrentCursor] = useState<AdminEventsCursor | null>(null)
  const [cursorHistory, setCursorHistory] = useState<Array<AdminEventsCursor | null>>([])
  const [eventName, setEventName] = useState('')
  const [environment, setEnvironment] = useState<EnvironmentFilterValue>('all')
  const [clientInstallId, setClientInstallId] = useState('')
  const [since, setSince] = useState('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const params = useMemo(() => ({
    eventName,
    environment: environment === 'all' ? '' : environment,
    clientInstallId,
    since,
    limit: EVENTS_PAGE_SIZE,
    cursorReceivedAt: currentCursor?.receivedAt ?? '',
    cursorEventId: currentCursor?.eventId ?? '',
  }), [clientInstallId, currentCursor, eventName, environment, since])

  const resetPagination = useCallback(() => {
    setCurrentCursor(null)
    setCursorHistory([])
    setNextCursor(null)
    setHasNextPage(false)
    setSelectedEventId(null)
  }, [])

  const applyClientFilter = useCallback((nextClientInstallId: string) => {
    setClientInstallId(nextClientInstallId)
    resetPagination()
  }, [resetPagination])

  const clearClientFilter = useCallback(() => {
    setClientInstallId('')
    resetPagination()
  }, [resetPagination])

  useEffect(() => {
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      adminFetch<AdminEventsResponse>('events', params)
        .then((data) => {
          if (cancelled) return
          setEvents(data.events)
          setEventNames(data.eventNames)
          setHasNextPage(data.hasNextPage)
          setNextCursor(data.nextCursor)
          setSelectedEventId((current) => {
            if (!current) return null
            return data.events.some((event) => event.event_id === current) ? current : null
          })
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : '이벤트 로그를 불러오지 못했습니다.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [params, reloadKey])

  const page = cursorHistory.length + 1
  const hasPreviousPage = cursorHistory.length > 0

  const goNext = () => {
    if (!nextCursor) return
    setCursorHistory((history) => [...history, currentCursor])
    setCurrentCursor(nextCursor)
    setSelectedEventId(null)
  }

  const goPrevious = () => {
    if (!hasPreviousPage) return
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? null
    setCursorHistory((history) => history.slice(0, -1))
    setCurrentCursor(previousCursor)
    setSelectedEventId(null)
  }

  return (
    <>
      <PageHeader
        title="이벤트 로그"
        description="이벤트명, 환경, 기간 필터와 커서 페이지네이션으로 클라이언트 이벤트를 조회합니다."
        action={(
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
              {loading ? '새로고침 중...' : '새로고침'}
            </AdminButton>
            <AdminButton href="/admin/events" variant="secondary">분석 열기</AdminButton>
          </div>
        )}
      />

      <Panel>
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <label>
            <span className="text-xs font-medium text-white/45">이벤트</span>
            <select value={eventName} onChange={(e) => {
              setEventName(e.target.value)
              resetPagination()
            }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="">전체 이벤트</option>
              {eventNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <EnvironmentToggle
            value={environment}
            onChange={(value) => {
              setEnvironment(value)
              resetPagination()
            }}
          />
          <label>
            <span className="text-xs font-medium text-white/45">기간</span>
            <select value={since} onChange={(e) => {
              setSince(e.target.value)
              resetPagination()
            }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="1">최근 24시간</option>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="all">전체 기간</option>
            </select>
          </label>
          <div className="flex items-end">
            <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/55">
              {loading ? '불러오는 중...' : `${page}페이지 · 이벤트 ${events.length}개`}
            </div>
          </div>
          {clientInstallId ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 md:col-span-4">
              <span className="text-xs font-medium text-white/45">Client id 필터</span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-white/70">{clientInstallId}</code>
              <button
                type="button"
                onClick={clearClientFilter}
                className="h-8 rounded-md border border-white/10 px-3 text-xs font-semibold text-white/65 transition-colors hover:border-white/20 hover:text-white"
              >
                해제
              </button>
            </div>
          ) : null}
        </div>
      </Panel>

      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {loading ? (
        <div className="mt-4"><LoadingState label="이벤트 로그를 불러오는 중..." /></div>
      ) : (
        <Panel
          title="이벤트 목록"
          action={(
            <EventsPaginationControls
              page={page}
              hasPrevious={hasPreviousPage}
              hasNext={hasNextPage}
              loading={loading}
              onPrevious={goPrevious}
              onNext={goNext}
            />
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
                <tr>
                  <th className="px-4 py-3 font-medium">이벤트</th>
                  <th className="px-4 py-3 font-medium">환경</th>
                  <th className="px-4 py-3 font-medium">Client id</th>
                  <th className="px-4 py-3 font-medium">버전</th>
                  <th className="px-4 py-3 font-medium">OS</th>
                  <th className="px-4 py-3 font-medium">수신 시각</th>
                  <th className="px-4 py-3 font-medium">속성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {events.length === 0 ? (
                  <EmptyRow colSpan={7} label="현재 필터에 맞는 이벤트가 없습니다." />
                ) : events.map((event) => {
                  const selected = selectedEventId === event.event_id

                  return (
                    <Fragment key={event.event_id}>
                      <tr
                        onClick={() => setSelectedEventId(selected ? null : event.event_id)}
                        className={`cursor-pointer transition-colors ${
                          selected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-white/80">{event.event_name}</td>
                        <td className="px-4 py-3"><StatusPill>{environmentLabel(event.environment)}</StatusPill></td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            title="Client id 필터 적용"
                            onClick={(clickEvent) => clickEvent.stopPropagation()}
                            onDoubleClick={(clickEvent) => {
                              clickEvent.stopPropagation()
                              applyClientFilter(event.client_install_id)
                            }}
                            className={`block max-w-[280px] truncate rounded px-1 py-0.5 text-left font-mono text-xs transition-colors ${
                              clientInstallId === event.client_install_id
                                ? 'bg-white/10 text-white/80'
                                : 'text-white/35 hover:bg-white/[0.04] hover:text-white/65'
                            }`}
                          >
                            {event.client_install_id}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-white/50">{event.app_version || '-'} {event.app_build ? `(${event.app_build})` : ''}</td>
                        <td className="px-4 py-3 text-white/50">{event.os_version || '-'}</td>
                        <td className="px-4 py-3 text-white/50">{formatDateTime(event.received_at)}</td>
                        <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-white/35">{JSON.stringify(event.attributes)}</td>
                      </tr>
                      {selected ? (
                        <tr className="bg-white/[0.025]">
                          <td colSpan={7} className="px-4 pb-5 pt-0">
                            <div className="rounded-lg border border-white/10 bg-[#08080E] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="text-xs font-medium text-white/35">이벤트 ID</p>
                                  <p className="mt-1 break-all font-mono text-xs text-white/65">{event.event_id}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-white/35">Client id</p>
                                  <p className="mt-1 break-all font-mono text-xs text-white/65">{event.client_install_id}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-white/35">발생 시각</p>
                                  <p className="mt-1 text-sm text-white/65">{formatDateTime(event.occurred_at)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-white/35">수신 시각</p>
                                  <p className="mt-1 text-sm text-white/65">{formatDateTime(event.received_at)}</p>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
                                  <p className="text-xs font-medium text-white/35">앱 버전</p>
                                  <p className="mt-1 text-sm text-white/70">{event.app_version || '-'} {event.app_build ? `(${event.app_build})` : ''}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
                                  <p className="text-xs font-medium text-white/35">OS</p>
                                  <p className="mt-1 text-sm text-white/70">{event.os_version || '-'}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
                                  <p className="text-xs font-medium text-white/35">환경</p>
                                  <div className="mt-1"><StatusPill>{environmentLabel(event.environment)}</StatusPill></div>
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <h3 className="text-sm font-semibold text-white/80">속성</h3>
                                  <span className="text-xs font-medium text-white/35">JSON</span>
                                </div>
                                <pre className="max-h-[420px] overflow-auto rounded-lg border border-primary-200/25 bg-[#050509] p-4 font-mono text-xs leading-6 text-primary-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                  {formatAttributes(event.attributes)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/10 px-4 py-3">
            <EventsPaginationControls
              page={page}
              hasPrevious={hasPreviousPage}
              hasNext={hasNextPage}
              loading={loading}
              onPrevious={goPrevious}
              onNext={goNext}
            />
          </div>
        </Panel>
      )}
    </>
  )
}
