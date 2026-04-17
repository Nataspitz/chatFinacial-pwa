/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../../../src/routes/ProtectedRoute'
import { createAuthState, getUseAuthMock } from '../mocks/auth-context.mock'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

const LoginProbe = (): JSX.Element => {
  const location = useLocation()
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? 'none'
  return <div>Login page from: {fromPath}</div>
}

const renderProtectedRoute = (initialPath = '/private'): void => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<div>Private content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute - unit behavior', () => {
  const useAuthMock = getUseAuthMock()

  beforeEach(() => {
    useAuthMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading state while auth status is being resolved', () => {
    useAuthMock.mockReturnValue(createAuthState({ loading: true }))

    renderProtectedRoute()

    expect(screen.getByText('Carregando sessao...')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to /login and preserves from location', async () => {
    useAuthMock.mockReturnValue(createAuthState({ isAuthenticated: false, loading: false }))

    renderProtectedRoute('/private')

    expect(await screen.findByText('Login page from: /private')).toBeInTheDocument()
  })

  it('renders outlet for authenticated users', async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        isAuthenticated: true,
        user: { id: 'user-1', email: 'user@test.com' }
      })
    )

    renderProtectedRoute('/private')

    expect(await screen.findByText('Private content')).toBeInTheDocument()
  })
})
