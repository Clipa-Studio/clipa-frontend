'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useAdmin } from '../../hooks/useAdmin'

const adminSections = [
  {
    title: 'Blog',
    description: 'Create posts, continue drafts, and manage published articles.',
    primaryLabel: 'New post',
    primaryHref: '/admin/blog/new',
    secondaryLabel: 'View blog',
    secondaryHref: '/blog/overview',
  },
  {
    title: 'Releases',
    description: 'Write release notes and publish product changelog updates.',
    primaryLabel: 'New release',
    primaryHref: '/admin/releases/new',
    secondaryLabel: 'View changelog',
    secondaryHref: '/releases',
  },
]

export default function AdminDashboardClient() {
  const router = useRouter()
  const { user, loading: authLoading, signInWithGoogle, signInWithGithub, signOut } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const loading = authLoading || adminLoading

  const handleSignOut = async () => {
    await signOut()
    router.replace('/admin')
  }

  return (
    <main className="min-h-screen bg-[#0C0C14] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <Link href="/admin" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Clipa" className="h-8 w-8" />
            <div>
              <p className="text-lg font-semibold leading-tight">Clipa Admin</p>
              <p className="text-xs text-white/45">admin.clipa.studio/admin</p>
            </div>
          </Link>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/65 transition-colors hover:border-white/20 hover:text-white"
            >
              Sign out
            </button>
          )}
        </header>

        <section className="flex flex-1 flex-col justify-center py-14">
          {loading ? (
            <div className="flex items-center gap-3 text-white/55">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-primary-300" />
              <span className="text-sm">Checking access...</span>
            </div>
          ) : !user ? (
            <div className="max-w-md">
              <h1 className="text-3xl font-bold tracking-tight">Admin sign in</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Use an account with the admin role to manage Clipa content.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => signInWithGoogle('admin')}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0C0C14] transition-colors hover:bg-white/90"
                >
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={() => signInWithGithub('admin')}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:text-white"
                >
                  Continue with GitHub
                </button>
              </div>
            </div>
          ) : !isAdmin ? (
            <div className="max-w-md">
              <h1 className="text-3xl font-bold tracking-tight">Access denied</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {user.email} is signed in, but this account does not have the admin role.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-8 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-sm font-medium text-primary-200">Signed in as {user.email}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">Admin dashboard</h1>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {adminSections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
                  >
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                    <p className="mt-2 min-h-[48px] text-sm leading-6 text-white/55">
                      {section.description}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={section.primaryHref}
                        className="rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-400"
                      >
                        {section.primaryLabel}
                      </Link>
                      <Link
                        href={section.secondaryHref}
                        className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-white/20 hover:text-white"
                      >
                        {section.secondaryLabel}
                      </Link>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
