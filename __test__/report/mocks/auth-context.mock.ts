import { vi } from 'vitest'

interface ReportAuthState {
  user: {
    id: string
    email: string
    user_metadata?: Record<string, unknown>
  } | null
  isAuthenticated: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

let authState: ReportAuthState = {
  user: {
    id: 'user-report-1',
    email: 'cfo@example.com',
    user_metadata: {
      full_name: 'CFO Teste'
    }
  },
  isAuthenticated: true,
  loading: false,
  signIn: vi.fn().mockResolvedValue(undefined),
  signUp: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined)
}

export const resetAuthMockState = (): void => {
  authState = {
    user: {
      id: 'user-report-1',
      email: 'cfo@example.com',
      user_metadata: {
        full_name: 'CFO Teste'
      }
    },
    isAuthenticated: true,
    loading: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined)
  }
}

export const useAuthMock = (): ReportAuthState => authState
