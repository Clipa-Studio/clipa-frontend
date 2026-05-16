'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

function subscriptionTypeLabel(type: string) {
  if (type === 'subscription') return '구독'
  if (type === 'limitless') return '영구 이용권'
  return type
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

function publishedLabel(published: boolean) {
  return published ? '게시됨' : '초안'
}

function environmentLabel(environment: string | null | undefined) {
  if (environment === 'prod') return 'Prod'
  if (environment === 'dev') return 'Dev'
  if (environment === 'all') return '전체'
  return '알 수 없음'
}

function windowLabel(value: string) {
  if (value === '1') return '최근 24시간'
  if (value === '7') return '최근 7일'
  if (value === '30') return '최근 30일'
  return '전체 기간'
}

function funnelStepLabel(label: string) {
  const labels: Record<string, string> = {
    'App opened': '앱 실행',
    'Record started': '녹화 시작',
    'Record completed': '녹화 완료',
    'Editor opened': '에디터 열림',
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
    'editor.opened': '에디터 열림',
    'export.opened': '내보내기 열림',
    'export.clicked': '내보내기 클릭',
    'export.completed': '내보내기 완료',
    'export.failed': '내보내기 실패',
    'export.blocked': '내보내기 차단',
    'Export Editor': '내보내기 에디터',
  }
  return names[eventName] ?? eventName
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

function ratio(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0
}

function conversionRate(current: number, previous: number) {
  if (previous <= 0) return 0
  return Math.min(100, ratio(current, previous))
}

export function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    adminFetch<{ profiles: AdminProfileRow[] }>('profiles')
      .then((data) => {
        if (!cancelled) setProfiles(data.profiles)
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

  return (
    <>
      <PageHeader
        title="프로필"
        description="Supabase Auth와 동기화된 사용자 프로필과 관리자 권한 상태를 확인합니다."
      />

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
              ) : profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{profile.display_name || profile.email || '이름 없는 사용자'}</p>
                    <p className="mt-1 text-xs text-white/40">{profile.email || '-'}</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill tone={roleTone(profile.role)}>{roleLabel(profile.role)}</StatusPill></td>
                  <td className="px-4 py-3 text-white/55">{formatDateTime(profile.created_at)}</td>
                  <td className="px-4 py-3 text-white/55">{formatDateTime(profile.updated_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/35">{profile.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    user_id: '',
    type: 'subscription',
    status: 'active',
    billing_cycle_interval: 'month',
    paddle_customer_id: '',
    paddle_subscription_id: '',
    product_id: 'manual',
    price_id: 'manual',
    subscription_period_end: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetch<{ subscriptions: AdminSubscriptionRow[] }>('subscriptions')
      setSubscriptions(data.subscriptions)
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
      await adminMutate('subscriptions', 'POST', form)
      setShowForm(false)
      setForm((prev) => ({ ...prev, user_id: '', paddle_customer_id: '', paddle_subscription_id: '', subscription_period_end: '' }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 정보를 추가하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="구독 정보를 불러오는 중..." />

  return (
    <>
      <PageHeader
        title="구독"
        description="현재 구독 상태를 확인하고 지원 처리를 위해 수동 구독 정보를 추가합니다."
        action={<AdminButton onClick={() => setShowForm((value) => !value)}>{showForm ? '폼 닫기' : '구독 추가'}</AdminButton>}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {showForm && (
        <Panel title="구독 추가">
          <form onSubmit={handleSubmit} className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="md:col-span-2">
              <span className="text-xs font-medium text-white/45">사용자 ID</span>
              <input required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">유형</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                <option value="subscription">구독</option>
                <option value="limitless">영구 이용권</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">상태</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                <option value="active">활성</option>
                <option value="past_due">결제 지연</option>
                <option value="canceled">해지</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">주기</span>
              <select value={form.billing_cycle_interval} onChange={(e) => setForm({ ...form, billing_cycle_interval: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                <option value="month">월간</option>
                <option value="year">연간</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Paddle 고객 ID</span>
              <input value={form.paddle_customer_id} onChange={(e) => setForm({ ...form, paddle_customer_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Paddle 구독 ID</span>
              <input value={form.paddle_subscription_id} onChange={(e) => setForm({ ...form, paddle_subscription_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">상품 ID</span>
              <input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">가격 ID</span>
              <input value={form.price_id} onChange={(e) => setForm({ ...form, price_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">구독 종료일</span>
              <input type="datetime-local" value={form.subscription_period_end} onChange={(e) => setForm({ ...form, subscription_period_end: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <div className="flex items-end">
              <AdminButton type="submit" disabled={submitting}>{submitting ? '저장 중...' : '저장'}</AdminButton>
            </div>
          </form>
        </Panel>
      )}

      <Panel title={`구독 기록 ${subscriptions.length}개`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">플랜</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">고객</th>
                <th className="px-4 py-3 font-medium">현재 기간</th>
                <th className="px-4 py-3 font-medium">다음 결제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {subscriptions.length === 0 ? (
                <EmptyRow colSpan={6} label="구독 기록이 없습니다." />
              ) : subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{subscription.email || subscription.display_name || subscription.user_id}</p>
                    <p className="mt-1 font-mono text-xs text-white/35">{subscription.user_id}</p>
                  </td>
                  <td className="px-4 py-3 text-white/65">{subscriptionTypeLabel(subscription.type)} {subscription.billing_cycle_interval ? `· ${billingCycleLabel(subscription.billing_cycle_interval)}` : ''}</td>
                  <td className="px-4 py-3"><StatusPill tone={statusTone(subscription.status)}>{subscriptionStatusLabel(subscription.status)}</StatusPill></td>
                  <td className="px-4 py-3 text-white/50">{subscription.paddle_customer_id}</td>
                  <td className="px-4 py-3 text-white/50">{formatDate(subscription.subscription_period_start)} → {formatDate(subscription.subscription_period_end)}</td>
                  <td className="px-4 py-3 text-white/50">{formatDate(subscription.next_billed_at)}</td>
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
                    <p className="font-medium text-white/85">{row.title}</p>
                    <p className="mt-1 text-xs text-white/35">/{row.slug}</p>
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
  const [environment, setEnvironment] = useState('prod')
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
  const maxBreakdownCount = Math.max(...(data?.breakdown.map((row) => row.count) ?? [0]), 1)
  const maxFunnelCount = Math.max(...(data?.funnel.map((row) => row.count) ?? [0]), 1)

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
          <label>
            <span className="text-xs font-medium text-white/45">환경</span>
            <select value={environment} onChange={(event) => setEnvironment(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="prod">Prod</option>
              <option value="dev">Dev</option>
              <option value="all">전체</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-white/45">기간</span>
            <select value={since} onChange={(event) => setSince(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="1">최근 24시간</option>
              <option value="7">최근 7일</option>
              <option value="30">최근 30일</option>
              <option value="all">전체 기간</option>
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AnalyticsMetric label="전체 이벤트" value={formatNumber(summary.totalEvents)} detail={`클라이언트 ${formatNumber(summary.uniqueClients)}개`} />
            <AnalyticsMetric label="내보내기 이슈" value={formatNumber(summary.exportFailed + summary.exportBlocked)} detail={`실패 ${summary.exportFailed}개, 차단 ${summary.exportBlocked}개`} />
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
                {data.funnel.map((step, index) => {
                  const previous = index === 0 ? step.count : data.funnel[index - 1]?.count ?? 0
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
            <Panel title="최근 실패/차단된 내보내기">
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
                      <EmptyRow colSpan={5} label="이 기간에는 실패하거나 차단된 내보내기가 없습니다." />
                    ) : data.issues.map((event) => (
                      <tr key={event.event_id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-medium text-white/80">{event.event_name}</td>
                        <td className="px-4 py-3"><StatusPill tone={event.event_name === 'export.failed' ? 'red' : 'yellow'}>{environmentLabel(event.environment)}</StatusPill></td>
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
  const [environment, setEnvironment] = useState('')
  const [since, setSince] = useState('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const params = useMemo(() => ({
    eventName,
    environment,
    since,
    limit: EVENTS_PAGE_SIZE,
    cursorReceivedAt: currentCursor?.receivedAt ?? '',
    cursorEventId: currentCursor?.eventId ?? '',
  }), [currentCursor, eventName, environment, since])

  const resetPagination = useCallback(() => {
    setCurrentCursor(null)
    setCursorHistory([])
    setNextCursor(null)
    setHasNextPage(false)
  }, [])

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
  }

  const goPrevious = () => {
    if (!hasPreviousPage) return
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? null
    setCursorHistory((history) => history.slice(0, -1))
    setCurrentCursor(previousCursor)
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
          <label>
            <span className="text-xs font-medium text-white/45">환경</span>
            <select value={environment} onChange={(e) => {
              setEnvironment(e.target.value)
              resetPagination()
            }} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="">전체</option>
              <option value="prod">Prod</option>
              <option value="dev">Dev</option>
            </select>
          </label>
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
                ) : events.map((event) => (
                  <tr key={event.event_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white/80">{event.event_name}</td>
                    <td className="px-4 py-3"><StatusPill>{environmentLabel(event.environment)}</StatusPill></td>
                    <td className="px-4 py-3 font-mono text-xs text-white/35">{event.client_install_id}</td>
                    <td className="px-4 py-3 text-white/50">{event.app_version || '-'} {event.app_build ? `(${event.app_build})` : ''}</td>
                    <td className="px-4 py-3 text-white/50">{event.os_version || '-'}</td>
                    <td className="px-4 py-3 text-white/50">{formatDateTime(event.received_at)}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-white/35">{JSON.stringify(event.attributes)}</td>
                  </tr>
                ))}
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
