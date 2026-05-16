'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  adminFetch,
  type AdminDashboardData,
} from './_components/adminApi'
import {
  AdminButton,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatusPill,
  formatDateTime,
} from './_components/AdminPrimitives'

function deltaLabel(current: number, previous: number) {
  const diff = current - previous
  if (diff === 0) return '전일과 동일'
  return `전일 대비 ${diff > 0 ? '+' : ''}${diff}`
}

type EventEnvironment = 'prod' | 'dev'

function environmentLabel(environment: string | null | undefined) {
  if (environment === 'prod') return 'Prod'
  if (environment === 'dev') return 'Dev'
  return '알 수 없음'
}

function MetricCard({
  label,
  value,
  detail,
  action,
}: {
  label: string
  value: number | string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="flex min-h-6 items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/35">{label}</p>
        {action}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {detail && <p className="mt-2 text-sm text-white/45">{detail}</p>}
    </div>
  )
}

export default function AdminDashboardClient() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [eventEnvironment, setEventEnvironment] = useState<EventEnvironment>('prod')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(false)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const dashboard = await adminFetch<AdminDashboardData>('dashboard')
      if (mountedRef.current) setData(dashboard)
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : '대시보드를 불러오지 못했습니다.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadDashboard()
    return () => {
      mountedRef.current = false
    }
  }, [loadDashboard])

  if (loading && !data) return <LoadingState label="대시보드를 불러오는 중..." />
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { metrics } = data
  const selectedEventMetrics = metrics.productEventsByEnvironment[eventEnvironment]

  return (
    <>
      <PageHeader
        title="대시보드"
        description="사용자, 구독, 제품 이벤트, 작성 중인 콘텐츠를 한 화면에서 확인합니다."
        action={(
          <div className="flex flex-wrap gap-2">
            <AdminButton onClick={loadDashboard} variant="secondary" disabled={loading}>
              {loading ? '새로고침 중...' : '새로고침'}
            </AdminButton>
            <AdminButton href="/admin/events" variant="secondary">이벤트 보기</AdminButton>
          </div>
        )}
      />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="전체 사용자" value={metrics.totalUsers} detail={deltaLabel(metrics.usersToday, metrics.usersYesterday)} />
        <MetricCard label="활성 구독" value={metrics.activeSubscriptions} detail={`활성 디바이스 ${metrics.activeDevices}대`} />
        <MetricCard
          label="오늘 이벤트"
          value={selectedEventMetrics.today}
          detail={deltaLabel(selectedEventMetrics.today, selectedEventMetrics.yesterday)}
          action={(
            <div className="inline-flex rounded-md border border-white/10 bg-[#0C0C14] p-0.5">
              {(['prod', 'dev'] as const).map((environment) => (
                <button
                  key={environment}
                  type="button"
                  onClick={() => setEventEnvironment(environment)}
                  className={`h-6 rounded px-2 text-[11px] font-semibold uppercase transition-colors ${
                    eventEnvironment === environment
                      ? 'bg-white text-[#0C0C14]'
                      : 'text-white/45 hover:text-white/75'
                  }`}
                >
                  {environment}
                </button>
              ))}
            </div>
          )}
        />
        <MetricCard label="초안 콘텐츠" value={metrics.draftPosts + metrics.draftReleases} detail={`블로그 ${metrics.draftPosts}개, ChangeLog ${metrics.draftReleases}개`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="최신 릴리스">
          {data.latestRelease ? (
            <div className="p-4">
              <div className="flex items-center gap-3">
                <StatusPill tone="green">게시됨</StatusPill>
                <span className="text-sm text-white/45">{formatDateTime(data.latestRelease.published_at)}</span>
              </div>
              <Link
                href={`/admin/changelog/${data.latestRelease.slug}/edit`}
                className="mt-4 block text-xl font-semibold text-white transition-colors hover:text-primary-200"
              >
                v{data.latestRelease.version} · {data.latestRelease.title}
              </Link>
            </div>
          ) : (
            <p className="p-4 text-sm text-white/45">아직 게시된 릴리스가 없습니다.</p>
          )}
        </Panel>

        <Panel title="최근 사용자">
          <div className="divide-y divide-white/10">
            {data.recentUsers.map((profile) => (
              <div key={profile.id} className="px-4 py-3">
                <p className="truncate text-sm font-medium text-white/80">
                  {profile.email || profile.id}
                </p>
                <p className="mt-1 text-xs text-white/40">{formatDateTime(profile.created_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="최근 제품 이벤트" action={<AdminButton href="/admin/events/logs" variant="secondary">로그 열기</AdminButton>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">이벤트</th>
                <th className="px-4 py-3 font-medium">환경</th>
                <th className="px-4 py-3 font-medium">버전</th>
                <th className="px-4 py-3 font-medium">수신 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.recentEvents.map((event) => (
                <tr key={event.event_id}>
                  <td className="px-4 py-3 text-white/80">{event.event_name}</td>
                  <td className="px-4 py-3"><StatusPill>{environmentLabel(event.environment)}</StatusPill></td>
                  <td className="px-4 py-3 text-white/50">{event.app_version || '-'} {event.app_build ? `(${event.app_build})` : ''}</td>
                  <td className="px-4 py-3 text-white/45">{formatDateTime(event.received_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
