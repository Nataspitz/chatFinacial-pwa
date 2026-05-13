import type { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null)
      setLoading(false)
      return
    }

    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return

      if (error) {
        setUser(null)
      } else {
        setUser(data.session?.user ?? null)
      }
      setLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado no ambiente.')
    }

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      throw error
    }
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado no ambiente.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw error
    }
  }

  const signOut = async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado no ambiente.')
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      loading,
      signUp,
      signIn,
      signOut
    }),
    [loading, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
