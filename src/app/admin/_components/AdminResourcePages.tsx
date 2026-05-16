'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  adminFetch,
  adminMutate,
  type AdminContentRow,
  type AdminDeviceRow,
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

function statusTone(status: string) {
  if (status === 'active') return 'green'
  if (status === 'past_due') return 'yellow'
  if (status === 'canceled') return 'red'
  return 'neutral'
}

function publishedTone(published: boolean) {
  return published ? 'green' : 'yellow'
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profiles')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading profiles..." />
  if (error) return <ErrorState message={error} />

  return (
    <>
      <PageHeader
        title="Profile"
        description="Profile and authentication data combined into one operational view."
      />

      <Panel title={`${profiles.length} profiles`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Email confirmed</th>
                <th className="px-4 py-3 font-medium">Last sign in</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {profiles.length === 0 ? (
                <EmptyRow colSpan={6} label="No profiles found." />
              ) : profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{profile.display_name || profile.email || profile.auth_email || 'Unnamed user'}</p>
                    <p className="mt-1 text-xs text-white/40">{profile.email || profile.auth_email || '-'}</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill tone={roleTone(profile.role)}>{profile.role}</StatusPill></td>
                  <td className="px-4 py-3 text-white/55">{formatDateTime(profile.email_confirmed_at)}</td>
                  <td className="px-4 py-3 text-white/55">{formatDateTime(profile.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-white/55">{formatDateTime(profile.created_at)}</td>
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
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
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
      setError(err instanceof Error ? err.message : 'Failed to create subscription')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading subscriptions..." />

  return (
    <>
      <PageHeader
        title="Subscription"
        description="Current subscription records with a manual insert path for support operations."
        action={<AdminButton onClick={() => setShowForm((value) => !value)}>{showForm ? 'Close form' : 'Add subscription'}</AdminButton>}
      />

      {error && <div className="mb-4"><ErrorState message={error} /></div>}

      {showForm && (
        <Panel title="Add subscription">
          <form onSubmit={handleSubmit} className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="md:col-span-2">
              <span className="text-xs font-medium text-white/45">User ID</span>
              <input required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                <option value="subscription">Subscription</option>
                <option value="limitless">Lifetime</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Cycle</span>
              <select value={form.billing_cycle_interval} onChange={(e) => setForm({ ...form, billing_cycle_interval: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Paddle customer ID</span>
              <input value={form.paddle_customer_id} onChange={(e) => setForm({ ...form, paddle_customer_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Paddle subscription ID</span>
              <input value={form.paddle_subscription_id} onChange={(e) => setForm({ ...form, paddle_subscription_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Product ID</span>
              <input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Price ID</span>
              <input value={form.price_id} onChange={(e) => setForm({ ...form, price_id: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <label>
              <span className="text-xs font-medium text-white/45">Period end</span>
              <input type="datetime-local" value={form.subscription_period_end} onChange={(e) => setForm({ ...form, subscription_period_end: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </label>
            <div className="flex items-end">
              <AdminButton type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</AdminButton>
            </div>
          </form>
        </Panel>
      )}

      <Panel title={`${subscriptions.length} subscription records`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Current period</th>
                <th className="px-4 py-3 font-medium">Next bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {subscriptions.length === 0 ? (
                <EmptyRow colSpan={6} label="No subscription records found." />
              ) : subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{subscription.email || subscription.display_name || subscription.user_id}</p>
                    <p className="mt-1 font-mono text-xs text-white/35">{subscription.user_id}</p>
                  </td>
                  <td className="px-4 py-3 text-white/65">{subscription.type} {subscription.billing_cycle_interval ? `· ${subscription.billing_cycle_interval}` : ''}</td>
                  <td className="px-4 py-3"><StatusPill tone={statusTone(subscription.status)}>{subscription.status}</StatusPill></td>
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
      setError(err instanceof Error ? err.message : 'Failed to load devices')
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
    if (!window.confirm(`Deactivate ${device.device_name || 'this device'}?`)) return
    setBusyId(device.id)
    setError(null)
    try {
      await adminMutate('devices', 'DELETE', { id: device.id })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate device')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <LoadingState label="Loading devices..." />

  return (
    <>
      <PageHeader title="Device" description="Active desktop device assignments. Deactivation removes the current device token for that user." />
      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      <Panel title={`${devices.length} active devices`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Activated</th>
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {devices.length === 0 ? (
                <EmptyRow colSpan={5} label="No active devices found." />
              ) : devices.map((device) => (
                <tr key={device.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{device.email || device.display_name || device.user_id}</p>
                    <p className="mt-1 font-mono text-xs text-white/35">{device.user_id}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">{device.device_name || 'Unnamed device'}</td>
                  <td className="px-4 py-3 text-white/50">{formatDateTime(device.activated_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/35">{device.device_token}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton variant="danger" onClick={() => deactivate(device)} disabled={busyId === device.id}>
                      {busyId === device.id ? 'Deactivating...' : 'Deactivate'}
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
  const title = isBlog ? 'Blog' : 'ChangeLog'
  const createHref = isBlog ? '/admin/blog/new' : '/admin/changelog/new'

  if (loading) return <LoadingState label={`Loading ${title.toLowerCase()}...`} />
  if (error) return <ErrorState message={error} />

  return (
    <>
      <PageHeader
        title={title}
        description={isBlog ? 'Draft and published posts with direct edit access.' : 'Draft and published release notes with direct edit access.'}
        action={<AdminButton href={createHref}>Create</AdminButton>}
      />
      <Panel title={`${rows.length} items`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">{isBlog ? 'Category' : 'Version'}</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.length === 0 ? (
                <EmptyRow colSpan={5} label={`No ${title.toLowerCase()} items found.`} />
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white/85">{row.title}</p>
                    <p className="mt-1 text-xs text-white/35">/{row.slug}</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill tone={publishedTone(row.published)}>{row.published ? 'Published' : 'Draft'}</StatusPill></td>
                  <td className="px-4 py-3 text-white/55">{isBlog ? row.category_slug || '-' : row.version || '-'}</td>
                  <td className="px-4 py-3 text-white/50">{formatDateTime(row.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton href={isBlog ? `/admin/blog/${row.id}/edit` : `/admin/changelog/${row.slug}/edit`} variant="secondary">
                      Edit
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load blog posts'))
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load changelog'))
      .finally(() => setLoading(false))
  }, [])

  return <ContentListPage type="changelog" rows={rows} loading={loading} error={error} />
}

export function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEventRow[]>([])
  const [eventNames, setEventNames] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [eventName, setEventName] = useState('')
  const [environment, setEnvironment] = useState('')
  const [since, setSince] = useState('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = useMemo(() => ({ eventName, environment, since, limit: 150 }), [eventName, environment, since])

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
          setTotal(data.total)
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load events')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [params])

  return (
    <>
      <PageHeader title="Click events" description="Client events with fast filters for event name, environment, and date window." />

      <Panel>
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <label>
            <span className="text-xs font-medium text-white/45">Event</span>
            <select value={eventName} onChange={(e) => setEventName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="">All events</option>
              {eventNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-white/45">Environment</span>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="">All</option>
              <option value="prod">prod</option>
              <option value="dev">dev</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-white/45">Window</span>
            <select value={since} onChange={(e) => setSince(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0C0C14] px-3 py-2 text-sm text-white outline-none focus:border-white/30">
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <div className="flex items-end">
            <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/55">
              {loading ? 'Loading...' : `${total} matching events`}
            </div>
          </div>
        </div>
      </Panel>

      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {loading ? (
        <div className="mt-4"><LoadingState label="Loading events..." /></div>
      ) : (
        <Panel title="Event list">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.08em] text-white/35">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Environment</th>
                  <th className="px-4 py-3 font-medium">Client install</th>
                  <th className="px-4 py-3 font-medium">App</th>
                  <th className="px-4 py-3 font-medium">OS</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium">Attributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {events.length === 0 ? (
                  <EmptyRow colSpan={7} label="No events match the current filters." />
                ) : events.map((event) => (
                  <tr key={event.event_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white/80">{event.event_name}</td>
                    <td className="px-4 py-3"><StatusPill>{event.environment || 'unknown'}</StatusPill></td>
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
        </Panel>
      )}
    </>
  )
}
