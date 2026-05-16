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
  auth_email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  auth_created_at: string | null
}

export type AdminSubscriptionRow = {
  id: string
  user_id: string
  email: string | null
  display_name: string | null
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

export type AdminDeviceRow = {
  id: string
  user_id: string
  email: string | null
  display_name: string | null
  device_name: string | null
  device_token: string
  activated_at: string
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

export async function adminFetch<T>(
  resource: string,
  params: Record<string, string | number | null | undefined> = {},
): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.access_token) {
    throw new Error('Admin session not found. Sign in again.')
  }

  const searchParams = new URLSearchParams({ resource })
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const response = await fetch(`/api/admin?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: 'no-store',
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error || 'Failed to load admin data')
  }

  return body as T
}

export async function adminMutate<T>(
  resource: string,
  method: 'POST' | 'DELETE',
  body: Record<string, unknown>,
): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.access_token) {
    throw new Error('Admin session not found. Sign in again.')
  }

  const response = await fetch(`/api/admin?resource=${encodeURIComponent(resource)}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || 'Admin action failed')
  }

  return payload as T
}
