import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type AdminClient = SupabaseClient
type CountQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>

let authClient: SupabaseClient | null = null
let adminClient: AdminClient | null = null

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return value
}

function getAuthClient() {
  if (authClient) return authClient

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  authClient = createClient(getSupabaseUrl(), anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return authClient
}

function getAdminClient() {
  if (adminClient) return adminClient

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  adminClient = createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

async function requireAdmin(request: NextRequest) {
  const token = getBearerToken(request)
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing bearer token' }, { status: 401 }) }
  }

  const { data, error } = await getAuthClient().auth.getUser(token)
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) }
  }

  const admin = getAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, email, display_name')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user: data.user, admin }
}

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

async function getCount(admin: AdminClient, table: string, apply?: (query: CountQuery) => CountQuery) {
  let query = admin.from(table).select('*', { count: 'exact', head: true })
  if (apply) query = apply(query)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function getProfiles(admin: AdminClient) {
  const [{ data: profiles, error: profileError }, authResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, display_name, avatar_url, role, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (profileError) throw profileError
  if (authResult.error) throw authResult.error

  const authById = new Map<string, User>()
  authResult.data.users.forEach((user) => authById.set(user.id, user))

  return (profiles ?? []).map((profile) => {
    const authUser = authById.get(profile.id)
    return {
      ...profile,
      auth_email: authUser?.email ?? null,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      auth_created_at: authUser?.created_at ?? null,
    }
  })
}

async function getProfileMap(admin: AdminClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { email: string | null; display_name: string | null }>()

  const { data, error } = await admin
    .from('profiles')
    .select('id, email, display_name')
    .in('id', Array.from(new Set(userIds)))

  if (error) throw error

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      { email: profile.email, display_name: profile.display_name },
    ]),
  )
}

async function getSubscriptions(admin: AdminClient) {
  const { data, error } = await admin
    .from('subscriptions')
    .select('id, user_id, type, status, paddle_customer_id, paddle_subscription_id, product_id, price_id, billing_cycle_interval, subscription_period_start, subscription_period_end, next_billed_at, canceled_at, subscription_created_at')
    .order('subscription_created_at', { ascending: false })
    .limit(200)

  if (error) throw error

  const profiles = await getProfileMap(admin, (data ?? []).map((row) => row.user_id))
  return (data ?? []).map((row) => ({
    ...row,
    email: profiles.get(row.user_id)?.email ?? null,
    display_name: profiles.get(row.user_id)?.display_name ?? null,
  }))
}

async function getDevices(admin: AdminClient) {
  const { data, error } = await admin
    .from('user_devices')
    .select('id, user_id, device_token, device_name, activated_at')
    .order('activated_at', { ascending: false })
    .limit(200)

  if (error) throw error

  const profiles = await getProfileMap(admin, (data ?? []).map((row) => row.user_id))
  return (data ?? []).map((row) => ({
    ...row,
    email: profiles.get(row.user_id)?.email ?? null,
    display_name: profiles.get(row.user_id)?.display_name ?? null,
  }))
}

async function getContent(admin: AdminClient, table: 'blog_posts' | 'releases') {
  const columns = table === 'blog_posts'
    ? 'id, title, slug, published, category_slug, published_at, created_at, updated_at'
    : 'id, title, version, slug, published, published_at, created_at, updated_at'

  const { data, error } = await admin
    .from(table)
    .select(columns)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return data ?? []
}

async function getEvents(admin: AdminClient, request: NextRequest) {
  const eventName = request.nextUrl.searchParams.get('eventName')
  const environment = request.nextUrl.searchParams.get('environment')
  const since = request.nextUrl.searchParams.get('since')
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 100), 300)

  let query = admin
    .from('client_events')
    .select('event_id, client_install_id, event_name, event_version, occurred_at, received_at, app_version, app_build, os_version, attributes, environment', { count: 'exact' })
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
    admin.from('client_events').select('event_name').order('event_name', { ascending: true }).limit(1000),
  ])

  if (error) throw error
  if (namesResult.error) throw namesResult.error

  return {
    events: data ?? [],
    eventNames: Array.from(new Set((namesResult.data ?? []).map((event) => event.event_name))),
    total: count ?? 0,
  }
}

async function getDashboard(admin: AdminClient) {
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
    getCount(admin, 'profiles'),
    getCount(admin, 'profiles', (query) => query.gte('created_at', today.toISOString())),
    getCount(admin, 'profiles', (query) => query.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString())),
    getCount(admin, 'client_events', (query) => query.gte('received_at', today.toISOString()).ilike('event_name', '%.clicked')),
    getCount(admin, 'client_events', (query) => query.gte('received_at', yesterday.toISOString()).lt('received_at', today.toISOString()).ilike('event_name', '%.clicked')),
    getCount(admin, 'subscriptions', (query) => query.in('status', ['active', 'past_due'])),
    getCount(admin, 'user_devices'),
    getCount(admin, 'blog_posts', (query) => query.eq('published', false)),
    getCount(admin, 'releases', (query) => query.eq('published', false)),
    admin
      .from('releases')
      .select('id, title, version, slug, published, published_at, created_at, updated_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProfiles(admin).then((rows) => rows.slice(0, 5)),
    admin
      .from('client_events')
      .select('event_id, client_install_id, event_name, occurred_at, received_at, app_version, app_build, os_version, attributes, environment')
      .order('received_at', { ascending: false })
      .limit(8),
  ])

  if (latestReleaseResult.error) throw latestReleaseResult.error
  if (recentEventsResult.error) throw recentEventsResult.error

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
    latestRelease: latestReleaseResult.data,
    recentUsers,
    recentEvents: recentEventsResult.data ?? [],
  }
}

async function createSubscription(admin: AdminClient, request: NextRequest) {
  const body = await request.json()
  const now = new Date().toISOString()

  const payload = {
    user_id: body.user_id,
    type: body.type || 'subscription',
    status: body.status || 'active',
    paddle_customer_id: body.paddle_customer_id || `manual-${body.user_id}`,
    paddle_subscription_id: body.paddle_subscription_id || null,
    paddle_transaction_id: body.paddle_transaction_id || null,
    product_id: body.product_id || 'manual',
    price_id: body.price_id || 'manual',
    billing_cycle_interval: body.type === 'limitless' ? null : body.billing_cycle_interval || 'month',
    subscription_period_start: body.subscription_period_start || now,
    subscription_period_end: body.subscription_period_end || null,
    next_billed_at: body.next_billed_at || null,
    subscription_created_at: now,
  }

  if (!payload.user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('subscriptions')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ subscription: data })
}

async function deleteDevice(admin: AdminClient, request: NextRequest) {
  const body = await request.json()
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await admin
    .from('user_devices')
    .delete()
    .eq('id', body.id)

  if (error) throw error
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdmin(request)
    if (context.error) return context.error

    const resource = request.nextUrl.searchParams.get('resource') || 'dashboard'
    const { admin } = context

    if (resource === 'dashboard') return NextResponse.json(await getDashboard(admin))
    if (resource === 'profiles') return NextResponse.json({ profiles: await getProfiles(admin) })
    if (resource === 'subscriptions') return NextResponse.json({ subscriptions: await getSubscriptions(admin) })
    if (resource === 'devices') return NextResponse.json({ devices: await getDevices(admin) })
    if (resource === 'blog') return NextResponse.json({ posts: await getContent(admin, 'blog_posts') })
    if (resource === 'changelog') return NextResponse.json({ releases: await getContent(admin, 'releases') })
    if (resource === 'events') return NextResponse.json(await getEvents(admin, request))

    return NextResponse.json({ error: 'Unknown admin resource' }, { status: 404 })
  } catch (error) {
    console.error('[Admin API] GET failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin API failed' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireAdmin(request)
    if (context.error) return context.error

    const resource = request.nextUrl.searchParams.get('resource')
    if (resource === 'subscriptions') return createSubscription(context.admin, request)

    return NextResponse.json({ error: 'Unknown admin action' }, { status: 404 })
  } catch (error) {
    console.error('[Admin API] POST failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin action failed' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await requireAdmin(request)
    if (context.error) return context.error

    const resource = request.nextUrl.searchParams.get('resource')
    if (resource === 'devices') return deleteDevice(context.admin, request)

    return NextResponse.json({ error: 'Unknown admin action' }, { status: 404 })
  } catch (error) {
    console.error('[Admin API] DELETE failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin action failed' },
      { status: 500 },
    )
  }
}
