'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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
  if (diff === 0) return 'No change'
  return `${diff > 0 ? '+' : ''}${diff} vs yesterday`
}

function MetricCard({
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
      {detail && <p className="mt-2 text-sm text-white/45">{detail}</p>}
    </div>
  )
}

export default function AdminDashboardClient() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const dashboard = await adminFetch<AdminDashboardData>('dashboard')
        if (!cancelled) setData(dashboard)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading dashboard..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const { metrics } = data

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A concise view of users, subscriptions, product events, and content work in progress."
        action={<AdminButton href="/admin/events" variant="secondary">View events</AdminButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total users" value={metrics.totalUsers} detail={deltaLabel(metrics.usersToday, metrics.usersYesterday)} />
        <MetricCard label="Click events today" value={metrics.clickEventsToday} detail={deltaLabel(metrics.clickEventsToday, metrics.clickEventsYesterday)} />
        <MetricCard label="Active subscriptions" value={metrics.activeSubscriptions} detail={`${metrics.activeDevices} active devices`} />
        <MetricCard label="Draft content" value={metrics.draftPosts + metrics.draftReleases} detail={`${metrics.draftPosts} posts, ${metrics.draftReleases} changelogs`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Latest release">
          {data.latestRelease ? (
            <div className="p-4">
              <div className="flex items-center gap-3">
                <StatusPill tone="green">Published</StatusPill>
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
            <p className="p-4 text-sm text-white/45">No published release yet.</p>
          )}
        </Panel>

        <Panel title="Recent users">
          <div className="divide-y divide-white/10">
            {data.recentUsers.map((profile) => (
              <div key={profile.id} className="px-4 py-3">
                <p className="truncate text-sm font-medium text-white/80">
                  {profile.email || profile.auth_email || profile.id}
                </p>
                <p className="mt-1 text-xs text-white/40">{formatDateTime(profile.created_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent click and product events" action={<AdminButton href="/admin/events" variant="secondary">Open list</AdminButton>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Environment</th>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.recentEvents.map((event) => (
                <tr key={event.event_id}>
                  <td className="px-4 py-3 text-white/80">{event.event_name}</td>
                  <td className="px-4 py-3"><StatusPill>{event.environment || 'unknown'}</StatusPill></td>
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
