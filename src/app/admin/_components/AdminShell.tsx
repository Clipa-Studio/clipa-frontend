'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useAdmin } from '../../../hooks/useAdmin'

type NavItem = {
  label: string
  href: string
  icon: 'dashboard' | 'user' | 'card' | 'device' | 'post' | 'plus' | 'release' | 'event'
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '개요',
    items: [
      { label: '대시보드', href: '/admin', icon: 'dashboard' },
    ],
  },
  {
    label: '사용자',
    items: [
      { label: '프로필', href: '/admin/profile', icon: 'user' },
      { label: '구독', href: '/admin/subscriptions', icon: 'card' },
      { label: '디바이스', href: '/admin/devices', icon: 'device' },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { label: '블로그', href: '/admin/blog', icon: 'post' },
      { label: 'ChangeLog', href: '/admin/changelog', icon: 'release' },
    ],
  },
  {
    label: '분석',
    items: [
      { label: '이벤트 분석', href: '/admin/events', icon: 'event' },
      { label: '이벤트 로그', href: '/admin/events/logs', icon: 'event' },
    ],
  },
]

function NavIcon({ name }: { name: NavItem['icon'] }) {
  const path = {
    dashboard: 'M4 5a1 1 0 0 1 1-1h5v7H4V5Zm10-1h5a1 1 0 0 1 1 1v3h-6V4ZM4 15h6v5H5a1 1 0 0 1-1-1v-4Zm10-3h6v7a1 1 0 0 1-1 1h-5v-8Z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0H5Z',
    card: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V7Zm0 5h16v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Zm3 3v2h4v-2H7Z',
    device: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 2v14h6V5H9Zm3 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    post: 'M5 4h14v16H5V4Zm3 4h8V6H8v2Zm0 4h8v-2H8v2Zm0 4h5v-2H8v2Z',
    plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
    release: 'M6 3h9l3 3v15H6V3Zm8 1.5V7h2.5L14 4.5ZM9 11h6V9H9v2Zm0 4h6v-2H9v2Zm0 4h4v-2H9v2Z',
    event: 'M13 2 5 13h6l-1 9 8-12h-6l1-8Z',
  }[name]

  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href
  if (href === '/admin/events') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle, signInWithGithub, signOut } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const loading = authLoading || adminLoading

  const handleSignOut = async () => {
    await signOut()
    router.replace('/admin')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0C0C14] text-white">
        <div className="flex items-center gap-3 text-white/55">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-primary-300" />
          <span className="text-sm">관리자 권한 확인 중...</span>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0C0C14] px-6 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <Link href="/admin" className="mb-10 flex items-center gap-3">
            <img src="/images/logo.png" alt="Clipa" className="h-9 w-9" />
            <div>
              <p className="text-lg font-semibold leading-tight">Clipa 관리자</p>
              <p className="text-xs text-white/45">admin.clipa.studio/admin</p>
            </div>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">관리자 로그인</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            관리자 권한이 있는 계정으로 로그인하세요.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => signInWithGoogle('admin')}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0C0C14] transition-colors hover:bg-white/90"
            >
              Google로 계속
            </button>
            <button
              type="button"
              onClick={() => signInWithGithub('admin')}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              GitHub로 계속
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#0C0C14] px-6 text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
          <h1 className="text-3xl font-bold tracking-tight">접근 권한 없음</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            {user.email} 계정은 로그인되어 있지만 관리자 권한이 없습니다.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-8 w-fit rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0C0C14] text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-[#111119] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <Link href="/admin" className="flex items-center gap-3">
                <img src="/images/logo.png" alt="Clipa" className="h-8 w-8" />
	                <div>
	                  <p className="text-base font-semibold leading-tight">Clipa 관리자</p>
	                  <p className="text-xs text-white/40">운영 콘솔</p>
	                </div>
              </Link>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    {group.label}
                  </p>
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      const active = isActive(pathname, item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-white text-[#0C0C14]'
                              : 'text-white/62 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                              active ? 'bg-[#0C0C14] text-white' : 'bg-white/[0.06] text-white/50'
                            }`}
                          >
                            <NavIcon name={item.icon} />
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-4">
              <p className="truncate text-sm font-medium text-white/80">{user.email}</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:border-white/20 hover:text-white"
	              >
	                로그아웃
	              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-5 py-6 sm:px-7 lg:px-9">
          {children}
        </section>
      </div>
    </main>
  )
}
