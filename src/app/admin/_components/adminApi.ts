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

export type AdminDashboardData = {
  metrics: {
    totalUsers: number
    usersToday: number
    usersYesterday: number
    clickEventsToday: number
    clickEventsYesterday: number
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
  total: number
}

type AdminResource =
  | 'dashboard'
  | 'profiles'
  | 'subscriptions'
  | 'devices'
  | 'blog'
  | 'changelog'
  | 'events'
type CountQuery = ReturnType<ReturnType<typeof supabase.from>['select']>

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfYesterday() {
  const date = startOfToday()
  date.setDate(date.getDate() - 1)
  return date
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
    throw new Error('Admin session not found. Sign in again.')
  }
}

async function getCount(table: string, apply?: (query: CountQuery) => CountQuery) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (apply) query = apply(query)
  const { count, error } = await query
  throwIfError(error, `Failed to count ${table}`)
  return count ?? 0
}

async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  throwIfError(error, 'Failed to load profiles')
  return (data ?? []) as AdminProfileRow[]
}

async function getProfileMap(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)))
  if (ids.length === 0) return new Map<string, { email: string | null; display_name: string | null }>()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', ids)

  throwIfError(error, 'Failed to load profile map')

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

  throwIfError(error, 'Failed to load subscriptions')

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

  throwIfError(error, 'Failed to load devices')

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

  throwIfError(error, `Failed to load ${table}`)
  return (data ?? []) as AdminContentRow[]
}

async function getEvents(params: Record<string, string | number | null | undefined>) {
  const eventName = typeof params.eventName === 'string' ? params.eventName : ''
  const environment = typeof params.environment === 'string' ? params.environment : ''
  const since = typeof params.since === 'string' ? params.since : ''
  const limit = Math.min(Number(params.limit || 100), 300)

  let query = supabase
    .from('client_events')
    .select('event_id, client_install_id, event_name, occurred_at, received_at, app_version, app_build, os_version, attributes, environment', { count: 'exact' })
    .order('received_at', { ascending: false })
    .limit(limit)

  if (eventName) query = query.eq('event_name', eventName)
  if (environment) query = query.eq('environment', environment)
  if (since && since !== 'all') {
    const date = new Date()
    date.setDate(date.getDate() - Number(since))
    query = query.gte('received_at', date.toISOString())
  }

  const [{ data, error, count }, namesResult] = await Promise.all([
    query,
    supabase.from('client_events').select('event_name').order('event_name', { ascending: true }).limit(1000),
  ])

  throwIfError(error, 'Failed to load events')
  throwIfError(namesResult.error, 'Failed to load event names')

  return {
    events: (data ?? []) as AdminEventRow[],
    eventNames: Array.from(new Set(((namesResult.data ?? []) as Array<{ event_name: string }>).map((event) => event.event_name))),
    total: count ?? 0,
  }
}

async function getDashboard() {
  const today = startOfToday()
  const yesterday = startOfYesterday()

  const [
    totalUsers,
    usersToday,
    usersYesterday,
    clickEventsToday,
    clickEventsYesterday,
    activeSubscriptions,
    activeDevices,
    draftPosts,
    draftReleases,
    latestReleaseResult,
    recentUsers,
    recentEventsResult,
  ] = await Promise.all([
    getCount('profiles'),
    getCount('profiles', (query) => query.gte('created_at', today.toISOString())),
    getCount('profiles', (query) => query.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString())),
    getCount('client_events', (query) => query.gte('received_at', today.toISOString()).ilike('event_name', '%.clicked')),
    getCount('client_events', (query) => query.gte('received_at', yesterday.toISOString()).lt('received_at', today.toISOString()).ilike('event_name', '%.clicked')),
    getCount('subscriptions', (query) => query.in('status', ['active', 'past_due'])),
    getCount('user_devices'),
    getCount('blog_posts', (query) => query.eq('published', false)),
    getCount('releases', (query) => query.eq('published', false)),
    supabase
      .from('releases')
      .select('id, title, version, slug, published, published_at, created_at, updated_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProfiles().then((rows) => rows.slice(0, 5)),
    supabase
      .from('client_events')
      .select('event_id, client_install_id, event_name, occurred_at, received_at, app_version, app_build, os_version, attributes, environment')
      .order('received_at', { ascending: false })
      .limit(8),
  ])

  throwIfError(latestReleaseResult.error, 'Failed to load latest release')
  throwIfError(recentEventsResult.error, 'Failed to load recent events')

  return {
    metrics: {
      totalUsers,
      usersToday,
      usersYesterday,
      clickEventsToday,
      clickEventsYesterday,
      activeSubscriptions,
      activeDevices,
      draftPosts,
      draftReleases,
    },
    latestRelease: latestReleaseResult.data as AdminContentRow | null,
    recentUsers,
    recentEvents: (recentEventsResult.data ?? []) as AdminEventRow[],
  }
}

async function createSubscription(body: Record<string, unknown>) {
  const now = new Date().toISOString()
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : ''

  if (!userId) {
    throw new Error('user_id is required')
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

  throwIfError(error, 'Failed to create subscription')
  return { subscription: data }
}

async function deleteDevice(body: Record<string, unknown>) {
  if (typeof body.id !== 'string' || body.id.length === 0) {
    throw new Error('id is required')
  }

  const { error } = await supabase
    .from('user_devices')
    .delete()
    .eq('id', body.id)

  throwIfError(error, 'Failed to deactivate device')
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

  throw new Error('Unknown admin action')
}
