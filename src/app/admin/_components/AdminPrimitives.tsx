import Link from 'next/link'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{description}</p>}
      </div>
      {action}
    </header>
  )
}

export function AdminButton({
  href,
  children,
  variant = 'primary',
  type,
  onClick,
  disabled,
}: {
  href?: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  const className = `inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    variant === 'primary'
      ? 'bg-white text-[#0C0C14] hover:bg-white/90'
      : variant === 'danger'
        ? 'border border-red-500/25 text-red-300 hover:bg-red-500/10'
        : 'border border-white/10 text-white/70 hover:border-white/20 hover:text-white'
  }`

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

export function Panel({
  title,
  children,
  action,
}: {
  title?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03]">
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-white/80">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'yellow' | 'red' | 'purple' }) {
  const className = {
    neutral: 'bg-white/[0.06] text-white/60 ring-white/10',
    green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
    yellow: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
    red: 'bg-red-500/10 text-red-300 ring-red-500/20',
    purple: 'bg-primary-500/10 text-primary-200 ring-primary-500/20',
  }[tone]

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  )
}

export function LoadingState({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-white/50">
      <div className="flex items-center gap-3 text-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        {label}
      </div>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  )
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
