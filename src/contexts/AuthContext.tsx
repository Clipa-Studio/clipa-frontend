'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: (from?: string, state?: string) => Promise<void>
  signInWithApple: (from?: string, state?: string) => Promise<void>
  signInWithGithub: (from?: string, state?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[Auth] getSession:', { hasSession: !!session, userId: session?.user?.id, email: session?.user?.email, error })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', { event, hasSession: !!session, userId: session?.user?.id, email: session?.user?.email })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const buildRedirectUrl = (from?: string, state?: string) => {
    const base = `${window.location.origin}/auth/callback`
    const params = new URLSearchParams()
    const useExactAdminCallback = from === 'admin' && window.location.hostname === 'admin.clipa.studio'
    if (from && !useExactAdminCallback) params.set('from', from)
    if (state) params.set('state', state)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  const signInWithGoogle = async (from?: string, state?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildRedirectUrl(from, state)
      }
    })
  }

  const signInWithApple = async (from?: string, state?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: buildRedirectUrl(from, state)
      }
    })
  }

  const signInWithGithub = async (from?: string, state?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: buildRedirectUrl(from, state)
      }
    })
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // 무시
    } finally {
      // SDK signOut이 실패해도 로컬 상태는 반드시 정리
      const storageKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`
      localStorage.removeItem(storageKey)
      setUser(null)
      setSession(null)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signInWithGoogle,
      signInWithApple,
      signInWithGithub,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
