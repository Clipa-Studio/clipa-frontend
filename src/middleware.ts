import { NextRequest, NextResponse } from 'next/server'

const ADMIN_HOST = 'admin.clipa.studio'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function normalizeHost(host: string): string {
  const value = host.toLowerCase()
  if (value.startsWith('[')) {
    const end = value.indexOf(']')
    return end === -1 ? value : value.slice(1, end)
  }
  return value.split(':')[0]
}

function isLocalOrPreviewHost(host: string): boolean {
  return LOCAL_HOSTS.has(host) || host.endsWith('.vercel.app')
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isAdminAuthCallback(pathname: string): boolean {
  return pathname === '/auth/callback'
}

function isAdminApiPath(pathname: string): boolean {
  return pathname === '/api/admin/revalidate-content'
}

function notFound() {
  return new NextResponse(null, { status: 404 })
}

export function middleware(request: NextRequest) {
  const hostname = normalizeHost(
    request.headers.get('x-forwarded-host') ??
      request.headers.get('host') ??
      request.nextUrl.host,
  )
  const { pathname } = request.nextUrl

  if (hostname === ADMIN_HOST) {
    return isAdminPath(pathname) || isAdminAuthCallback(pathname) || isAdminApiPath(pathname)
      ? NextResponse.next()
      : notFound()
  }

  if (isAdminPath(pathname) && !isLocalOrPreviewHost(hostname)) {
    return notFound()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}
