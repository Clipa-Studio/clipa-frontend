import { NextRequest, NextResponse } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'
import { DOWNLOAD_SOURCE_URL } from '../../../lib/download'

export const runtime = 'nodejs'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || ''

let authClient: ReturnType<typeof createClient> | null = null

const getAuthClient = () => {
  if (authClient) return authClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase auth environment variables')
  }

  authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return authClient
}

const getBearerToken = (request: NextRequest) => {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

const getFormString = (formData: FormData | null, key: string) => {
  const value = formData?.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const getRequestFormData = async (request: NextRequest) => {
  if (request.method !== 'POST') return null

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
    return null
  }

  return request.formData()
}

const getDownloadRequest = async (request: NextRequest) => {
  const formData = await getRequestFormData(request)

  return {
    token: getBearerToken(request) || getFormString(formData, 'access_token'),
    location: getFormString(formData, 'location') || request.nextUrl.searchParams.get('location') || 'unknown',
    referrer:
      getFormString(formData, 'referrer') ||
      request.nextUrl.searchParams.get('referrer') ||
      request.headers.get('referer') ||
      'Direct visit',
  }
}

const getAuthenticatedUser = async (token: string | null) => {
  if (!token) return null

  const { data, error } = await getAuthClient().auth.getUser(token)
  if (error || !data.user) return null

  return data.user
}

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || '알 수 없음'
}

const decodeHeaderValue = (value: string | null) => {
  if (!value) return ''

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const getHeaderLocation = (request: NextRequest) => {
  const city = decodeHeaderValue(request.headers.get('x-vercel-ip-city'))
  const region = decodeHeaderValue(request.headers.get('x-vercel-ip-country-region'))
  const country = request.headers.get('x-vercel-ip-country') || ''

  return [city || region, country].filter(Boolean).join(', ')
}

const formatLocationInfo = (location: string, ip: string) => {
  if (location) return `${location} (${ip})`
  return ip
}

const getLocationInfo = async (request: NextRequest, ip: string) => {
  const headerLocation = getHeaderLocation(request)

  if (ip === '알 수 없음') {
    return headerLocation || '알 수 없음'
  }

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      cache: 'no-store',
    })

    if (!response.ok) return formatLocationInfo(headerLocation, ip)

    const data = await response.json()
    const city = data.city || ''
    const region = data.region_code || data.region || ''
    const country = data.country_code || ''
    const location = [city || region, country].filter(Boolean).join(', ') || headerLocation

    return formatLocationInfo(location, ip)
  } catch {
    return formatLocationInfo(headerLocation, ip)
  }
}

const formatUserInfo = (user: User | null) => {
  if (!user) return 'guest'
  return user.email ? `${user.email} (${user.id})` : user.id
}

const notifyDownloadSuccess = async (request: NextRequest, location: string, referrer: string, user: User | null) => {
  if (!SLACK_WEBHOOK_URL) return

  const ip = getClientIp(request)
  const locationInfo = await getLocationInfo(request, ip)
  const userAgent = request.headers.get('user-agent') || '알 수 없음'

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `<!channel>\n🔔 딩동! 다운로드 성공 알림이에요~ 🔔\n\n(${location}에서 왔어요)\n📍 ${locationInfo}\n🔗 유입: ${referrer}\n👤 사용자: ${formatUserInfo(user)}\n🧭 UA: ${userAgent}`,
      }),
    })
  } catch (error) {
    console.error('Slack notification failed:', error)
  }
}

const handleDownload = async (request: NextRequest) => {
  const { token, location, referrer } = await getDownloadRequest(request)
  const user = await getAuthenticatedUser(token)

  const downloadResponse = await fetch(DOWNLOAD_SOURCE_URL, {
    redirect: 'follow',
    cache: 'no-store',
  })

  if (!downloadResponse.ok || !downloadResponse.body) {
    return NextResponse.json(
      { error: 'Download failed' },
      { status: downloadResponse.status || 502 },
    )
  }

  await notifyDownloadSuccess(request, location, referrer, user)

  const headers = new Headers()
  const passthroughHeaders = [
    'content-type',
    'content-length',
    'content-disposition',
    'cache-control',
    'last-modified',
    'etag',
  ]

  passthroughHeaders.forEach((header) => {
    const value = downloadResponse.headers.get(header)
    if (value) headers.set(header, value)
  })

  return new NextResponse(downloadResponse.body, {
    status: downloadResponse.status,
    headers,
  })
}

export async function GET(request: NextRequest) {
  return handleDownload(request)
}

export async function POST(request: NextRequest) {
  return handleDownload(request)
}
