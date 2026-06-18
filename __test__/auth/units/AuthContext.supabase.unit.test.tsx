import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn()
}))

vi.mock('../../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: authMock
  }
}))

const loadAuth = async () => {
  vi.resetModules()
  return import('../../../src/contexts/AuthContext')
}

describe('AuthProvider Supabase contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'user@app.test' } } },
      error: null
    })
    authMock.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    })
    authMock.signUp.mockResolvedValue({ error: null })
    authMock.signInWithPassword.mockResolvedValue({ error: null })
    authMock.signOut.mockResolvedValue({ error: null })
  })

  it('carrega sessao, assina mudancas de auth e expoe o usuario autenticado', async () => {
    const { AuthProvider, useAuth } = await loadAuth()
    const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(authMock.getSession).toHaveBeenCalledTimes(1)
    expect(authMock.onAuthStateChange).toHaveBeenCalledTimes(1)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.id).toBe('user-1')
  })

  it('envia credenciais para signUp, signIn e signOut do Supabase', async () => {
    const { AuthProvider, useAuth } = await loadAuth()
    const wrapper = ({ children }: PropsWithChildren) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.signUp('new@app.test', 'secret-1')
      await result.current.signIn('new@app.test', 'secret-1')
      await result.current.signOut()
    })

    expect(authMock.signUp).toHaveBeenCalledWith({ email: 'new@app.test', password: 'secret-1' })
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: 'new@app.test', password: 'secret-1' })
    expect(authMock.signOut).toHaveBeenCalledTimes(1)
  })
})
