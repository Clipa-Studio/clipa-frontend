import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || ''

type SlackEvent =
  | { type: 'contact_email_click'; referrer?: string }
  | { type: 'purchase_complete'; planName?: string; referrer?: string }
  | {
      type: 'subscription_cancel'
      email?: string
      reason?: string
      detail?: string
      referrer?: string
    }

const MAX_FIELD_LENGTH = 500

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

const getExpectedOrigin = (request: NextRequest) => {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (!host) return request.nextUrl.origin
  if (forwardedProto) return `${forwardedProto}://${host}`
  return request.nextUrl.origin
}

const isAllowedOrigin = (request: NextRequest) => {
  const origin = request.headers.get('origin')
  if (!origin) return false

  return origin === request.nextUrl.origin || origin === getExpectedOrigin(request)
}

const safeText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.slice(0, MAX_FIELD_LENGTH)
}

const parseSlackEvent = (body: unknown): SlackEvent | null => {
  if (!body || typeof body !== 'object') return null

  const event = body as Record<string, unknown>

  switch (event.type) {
    case 'contact_email_click':
      return {
        type: 'contact_email_click',
        referrer: safeText(event.referrer, '직접 접속'),
      }
    case 'purchase_complete':
      return {
        type: 'purchase_complete',
        planName: safeText(event.planName, 'unknown'),
        referrer: safeText(event.referrer, '직접 접속'),
      }
    case 'subscription_cancel':
      return {
        type: 'subscription_cancel',
        email: safeText(event.email, '알 수 없음'),
        reason: safeText(event.reason, '알 수 없음'),
        detail: typeof event.detail === 'string' ? event.detail.trim().slice(0, MAX_FIELD_LENGTH) : '',
        referrer: safeText(event.referrer, '직접 접속'),
      }
    default:
      return null
  }
}

const buildSlackMessage = (event: SlackEvent, locationInfo: string) => {
  const referrer = event.referrer || '직접 접속'
  const userInfo = `📍 ${locationInfo}\n🔗 유입: ${referrer}`

  switch (event.type) {
    case 'contact_email_click':
      return `<!channel>\n📩 문의 이메일 링크가 클릭되었어요! 📩\n\n(FAQ 하단에서 왔어요)\n${userInfo}`
    case 'purchase_complete':
      return `<!channel>\n🎉 결제가 완료되었어요! 🎉\n\n플랜: ${event.planName || 'unknown'}\n${userInfo}`
    case 'subscription_cancel':
      return `<!channel>\n🚨 [Clipa] 구독 취소 요청 🚨\n\n 이메일: ${event.email || '알 수 없음'}\n 취소 사유: ${
        event.reason || '알 수 없음'
      }${event.detail ? `\n 상세: ${event.detail}` : ''}\n${userInfo}`
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = parseSlackEvent(body)
  if (!event) {
    return NextResponse.json({ error: 'Unsupported Slack event' }, { status: 400 })
  }

  if (!SLACK_WEBHOOK_URL) {
    return NextResponse.json({ ok: true })
  }

  const ip = getClientIp(request)
  const locationInfo = await getLocationInfo(request, ip)

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildSlackMessage(event, locationInfo) }),
    })

    if (!response.ok) {
      console.error('Slack notification failed:', response.status, await response.text())
      return NextResponse.json({ error: 'Slack notification failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Slack notification failed:', error)
    return NextResponse.json({ error: 'Slack notification failed' }, { status: 502 })
  }
}
