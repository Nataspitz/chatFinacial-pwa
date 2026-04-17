import { useAuth } from '../../../src/contexts/AuthContext'
import { vi, type Mock } from 'vitest'

export interface MockAuthState {
  user: { id: string; email?: string } | null
  isAuthenticated: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const createAuthState = (overrides: Partial<MockAuthState> = {}): MockAuthState => {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

export const getUseAuthMock = (): Mock => useAuth as unknown as Mock

export const createAuthContextMock = createAuthState
