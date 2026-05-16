'use client'

import { supabase } from '../../../lib/supabase'

export type AdminProfileRow = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

type AdminSubscriptionRecord = {
  id: string
  user_id: string
  type: string
  status: string
  paddle_customer_id: string
  paddle_subscription_id: string | null
  product_id: string
  price_id: string
  billing_cycle_interval: string | null
  subscription_period_start: string | null
  subscription_period_end: string | null
  next_billed_at: string | null
  canceled_at: string | null
  subscription_created_at: string
}

export type AdminSubscriptionRow = AdminSubscriptionRecord & {
  email: string | null
  display_name: string | null
}

type AdminDeviceRecord = {
  id: string
  user_id: string
  device_name: string | null
  device_token: string
  activated_at: string
}

export type AdminDeviceRow = AdminDeviceRecord & {
  email: string | null
  display_name: string | null
}

export type AdminContentRow = {
  id: string
  title: string
  slug: string
  published: boolean
  category_slug?: string | null
  version?: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export type AdminEventRow = {
  event_id: string
  client_install_id: string
  event_name: string
  occurred_at: string
  received_at: string
  app_version: string | null
  app_build: string | null
  os_version: string | null
  environment: string | null
  attributes: Record<string, unknown>
}

export type AdminEventsCursor = {
  receivedAt: string
  eventId: string
}

export type AdminEnvironmentMetric = {
  today: number
  yesterday: number
}

export type AdminDashboardData = {
  metrics: {
    totalUsers: number
    usersToday: number
    usersYesterday: number
    clickEventsToday: number
    clickEventsYesterday: number
    productEventsToday: number
    productEventsYesterday: number
    clickEventsByEnvironment: {
      prod: AdminEnvironmentMetric
      dev: AdminEnvironmentMetric
    }
    productEventsByEnvironment: {
      prod: AdminEnvironmentMetric
      dev: AdminEnvironmentMetric
    }
    activeSubscriptions: number
    activeDevices: number
    draftPosts: number
    draftReleases: number
  }
  latestRelease: AdminContentRow | null
  recentUsers: AdminProfileRow[]
  recentEvents: AdminEventRow[]
}

export type AdminEventsResponse = {
  events: AdminEventRow[]
  eventNames: string[]
  hasNextPage: boolean
  nextCursor: AdminEventsCursor | null
  limit: number
}

export type AdminEventAnalyticsSummary = {
  totalEvents: number
  clickEvents: number
  uniqueClients: number
  exportCompleted: number
  exportFailed: number
  exportBlocked: number
  recordStarted: number
  recordCompleted: number
}

export type AdminEventBreakdownRow = {
  eventName: string
  count: number
}

export type AdminEnvironmentBreakdownRow = {
  environment: string
  count: number
}

export type AdminFunnelRow = {
  label: string
  eventName: string
  count: number
}

export type AdminIssueEventRow = Pick<AdminEventRow, 'event_id' | 'event_name' | 'environment' | 'app_version' | 'app_build' | 'os_version' | 'attributes' | 'received_at'>

export type AdminEventAnalyticsResponse = {
  summary: AdminEventAnalyticsSummary
  breakdown: AdminEventBreakdownRow[]
  environmentBreakdown: AdminEnvironmentBreakdownRow[]
  funnel: AdminFunnelRow[]
  issues: AdminIssueEventRow[]
}

type AdminResource =
  | 'dashboard'
  | 'profiles'
  | 'subscriptions'
  | 'devices'
  | 'blog'
  | 'changelog'
  | 'events'
  | 'eventAnalytics'

function getAdminTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
}

function toOptionalIso(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function throwIfError(error: { message?: string } | null | undefined, fallback: string) {
  if (error) throw new Error(error.message || fallback)
}

async function ensureSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    throw new Error('관리자 세션을 찾을 수 없습니다. 다시 로그인하세요.')
  }
}

async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  throwIfError(error, '프로필을 불러오지 못했습니다.')
  return (data ?? []) as AdminProfileRow[]
}

async function getProfileMap(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  if (ids.length === 0) return new Map<string, { email: string | null; display_name: string | null }>()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', ids)

  throwIfError(error, '프로필 정보를 불러오지 못했습니다.')

  return new Map(
    ((data ?? []) as Array<{ id: string; email: string | null; display_name: string | null }>).map((profile) => [
      profile.id,
      { email: profile.email, display_name: profile.display_name },
    ]),
  )
}

async function getSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, type, status, paddle_customer_id, paddle_subscription_id, product_id, price_id, billing_cycle_interval, subscription_period_start, subscription_period_end, next_billed_at, canceled_at, subscription_created_at')
    .order('subscription_created_at', { ascending: false })
    .limit(200)

  throwIfError(error, '구독 정보를 불러오지 못했습니다.')

  const rows = (data ?? []) as AdminSubscriptionRecord[]
  const profiles = await getProfileMap(rows.map((row) => row.user_id))
  return rows.map((row) => ({
    ...row,
    email: profiles.get(row.user_id)?.email ?? null,
    display_name: profiles.get(row.user_id)?.display_name ?? null,
  }))
}

async function getDevices() {
  const { data, error } = await supabase
    .from('user_devices')
    .select('id, user_id, device_token, device_name, activated_at')
    .order('activated_at', { ascending: false })
    .limit(200)

  throwIfError(error, '디바이스 정보를 불러오지 못했습니다.')

  const rows = (data ?? []) as AdminDeviceRecord[]
  const profiles = await getProfileMap(rows.map((row) => row.user_id))
  return rows.map((row) => ({
    ...row,
    email: profiles.get(row.user_id)?.email ?? null,
    display_name: profiles.get(row.user_id)?.display_name ?? null,
  }))
}

async function getContent(table: 'blog_posts' | 'releases') {
  const columns = table === 'blog_posts'
    ? 'id, title, slug, published, category_slug, published_at, created_at, updated_at'
    : 'id, title, version, slug, published, published_at, created_at, updated_at'

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order('updated_at', { ascending: false })
    .limit(200)

  throwIfError(error, `${table === 'blog_posts' ? '블로그' : 'ChangeLog'}를 불러오지 못했습니다.`)
  return (data ?? []) as AdminContentRow[]
}

async function getEvents(params: Record<string, string | number | null | undefined>) {
  const eventName = typeof params.eventName === 'string' ? params.eventName : ''
  const environment = typeof params.environment === 'string' ? params.environment : ''
  const since = typeof params.since === 'string' ? params.since : ''
  const cursorReceivedAt = typeof params.cursorReceivedAt === 'string' && params.cursorReceivedAt.length > 0
    ? params.cursorReceivedAt
    : null
  const cursorEventId = typeof params.cursorEventId === 'string' && params.cursorEventId.length > 0
    ? params.cursorEventId
    : null
  const limit = Math.max(10, Math.min(Number(params.limit || 50), 100))
  const sinceDays = since && since !== 'all' ? Number(since) : null

  const { data, error } = await supabase.rpc('admin_get_events', {
    p_event_name: eventName || null,
    p_environment: environment || null,
    p_since_days: Number.isFinite(sinceDays) ? sinceDays : null,
    p_cursor_received_at: cursorReceivedAt,
    p_cursor_event_id: cursorEventId,
    p_limit: limit,
  })

  throwIfError(error, '이벤트 로그를 불러오지 못했습니다.')

  const response = data as Partial<AdminEventsResponse> | null

  return {
    events: (response?.events ?? []) as AdminEventRow[],
    eventNames: response?.eventNames ?? [],
    hasNextPage: response?.hasNextPage === true,
    nextCursor: response?.nextCursor ?? null,
    limit: response?.limit ?? limit,
  }
}

async function getEventAnalytics(params: Record<string, string | number | null | undefined>) {
  const environment = typeof params.environment === 'string' ? params.environment : 'prod'
  const since = typeof params.since === 'string' ? params.since : '7'
  const sinceDays = since && since !== 'all' ? Number(since) : null

  const { data, error } = await supabase.rpc('admin_get_event_analytics', {
    p_environment: environment || 'prod',
    p_since_days: Number.isFinite(sinceDays) ? sinceDays : null,
    p_timezone: getAdminTimezone(),
  })

  throwIfError(error, '이벤트 분석을 불러오지 못했습니다.')

  const response = data as Partial<AdminEventAnalyticsResponse> | null

  return {
    summary: {
      totalEvents: response?.summary?.totalEvents ?? 0,
      clickEvents: response?.summary?.clickEvents ?? 0,
      uniqueClients: response?.summary?.uniqueClients ?? 0,
      exportCompleted: response?.summary?.exportCompleted ?? 0,
      exportFailed: response?.summary?.exportFailed ?? 0,
      exportBlocked: response?.summary?.exportBlocked ?? 0,
      recordStarted: response?.summary?.recordStarted ?? 0,
      recordCompleted: response?.summary?.recordCompleted ?? 0,
    },
    breakdown: response?.breakdown ?? [],
    environmentBreakdown: response?.environmentBreakdown ?? [],
    funnel: response?.funnel ?? [],
    issues: response?.issues ?? [],
  }
}

async function getDashboard() {
  const { data, error } = await supabase.rpc('admin_get_dashboard', {
    p_timezone: getAdminTimezone(),
    p_recent_limit: 8,
  })

  throwIfError(error, '대시보드를 불러오지 못했습니다.')

  if (!data || typeof data !== 'object') {
    throw new Error('대시보드를 불러오지 못했습니다.')
  }

  const dashboard = data as AdminDashboardData

  return {
    ...dashboard,
    metrics: {
      ...dashboard.metrics,
      productEventsToday: dashboard.metrics.productEventsToday ?? 0,
      productEventsYesterday: dashboard.metrics.productEventsYesterday ?? 0,
      clickEventsByEnvironment: {
        prod: {
          today: dashboard.metrics.clickEventsByEnvironment?.prod?.today ?? 0,
          yesterday: dashboard.metrics.clickEventsByEnvironment?.prod?.yesterday ?? 0,
        },
        dev: {
          today: dashboard.metrics.clickEventsByEnvironment?.dev?.today ?? 0,
          yesterday: dashboard.metrics.clickEventsByEnvironment?.dev?.yesterday ?? 0,
        },
      },
      productEventsByEnvironment: {
        prod: {
          today: dashboard.metrics.productEventsByEnvironment?.prod?.today ?? 0,
          yesterday: dashboard.metrics.productEventsByEnvironment?.prod?.yesterday ?? 0,
        },
        dev: {
          today: dashboard.metrics.productEventsByEnvironment?.dev?.today ?? 0,
          yesterday: dashboard.metrics.productEventsByEnvironment?.dev?.yesterday ?? 0,
        },
      },
    },
  }
}

async function createSubscription(body: Record<string, unknown>) {
  const now = new Date().toISOString()
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : ''

  if (!userId) {
    throw new Error('사용자 ID가 필요합니다.')
  }

  const payload = {
    user_id: userId,
    type: typeof body.type === 'string' && body.type.length > 0 ? body.type : 'subscription',
    status: typeof body.status === 'string' && body.status.length > 0 ? body.status : 'active',
    paddle_customer_id: typeof body.paddle_customer_id === 'string' && body.paddle_customer_id.length > 0
      ? body.paddle_customer_id
      : `manual-${userId}`,
    paddle_subscription_id: typeof body.paddle_subscription_id === 'string' && body.paddle_subscription_id.length > 0
      ? body.paddle_subscription_id
      : null,
    paddle_transaction_id: null,
    product_id: typeof body.product_id === 'string' && body.product_id.length > 0 ? body.product_id : 'manual',
    price_id: typeof body.price_id === 'string' && body.price_id.length > 0 ? body.price_id : 'manual',
    billing_cycle_interval: body.type === 'limitless'
      ? null
      : (typeof body.billing_cycle_interval === 'string' && body.billing_cycle_interval.length > 0 ? body.billing_cycle_interval : 'month'),
    subscription_period_start: now,
    subscription_period_end: toOptionalIso(body.subscription_period_end),
    next_billed_at: null,
    subscription_created_at: now,
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select()
    .single()

  throwIfError(error, '구독 정보를 추가하지 못했습니다.')
  return { subscription: data }
}

async function deleteDevice(body: Record<string, unknown>) {
  if (typeof body.id !== 'string' || body.id.length === 0) {
    throw new Error('ID가 필요합니다.')
  }

  const { error } = await supabase
    .from('user_devices')
    .delete()
    .eq('id', body.id)

  throwIfError(error, '디바이스를 비활성화하지 못했습니다.')
  return { ok: true }
}

export async function adminFetch<T>(
  resource: AdminResource,
  params: Record<string, string | number | null | undefined> = {},
): Promise<T> {
  await ensureSession()

  const result = await ({
    dashboard: () => getDashboard(),
    profiles: async () => ({ profiles: await getProfiles() }),
    subscriptions: async () => ({ subscriptions: await getSubscriptions() }),
    devices: async () => ({ devices: await getDevices() }),
    blog: async () => ({ posts: await getContent('blog_posts') }),
    changelog: async () => ({ releases: await getContent('releases') }),
    events: () => getEvents(params),
    eventAnalytics: () => getEventAnalytics(params),
  } satisfies Record<AdminResource, () => Promise<unknown>>)[resource]()

  return result as T
}

export async function adminMutate<T>(
  resource: 'subscriptions' | 'devices',
  method: 'POST' | 'DELETE',
  body: Record<string, unknown>,
): Promise<T> {
  await ensureSession()

  if (resource === 'subscriptions' && method === 'POST') {
    return createSubscription(body) as Promise<T>
  }

  if (resource === 'devices' && method === 'DELETE') {
    return deleteDevice(body) as Promise<T>
  }

  throw new Error('알 수 없는 관리자 작업입니다.')
}
