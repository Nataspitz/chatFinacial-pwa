/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAuthState } from '../mocks/auth-context.mock'

interface RootAuthInput {
  isAuthenticated: boolean
  loading?: boolean
}

const mockRouteDependencies = (): void => {
  vi.doMock('../../../src/pages/Login/Login', () => ({
    Login: () => createElement('div', null, 'Login Route Screen')
  }))
  vi.doMock('../../../src/pages/Chat/Chat', () => ({
    Chat: () => createElement('div', null, 'Chat Route Screen')
  }))
  vi.doMock('../../../src/pages/Dashboard/Dashboard', () => ({
    Dashboard: () => createElement('div', null, 'Dashboard Route Screen')
  }))
  vi.doMock('../../../src/pages/Report/Report', () => ({
    Report: () => createElement('div', null, 'Report Route Screen')
  }))
  vi.doMock('../../../src/pages/Calendario/Calendario', () => ({
    Calendario: () => createElement('div', null, 'Calendario Route Screen')
  }))
  vi.doMock('../../../src/pages/Settings/Settings', () => ({
    Settings: () => createElement('div', null, 'Settings Route Screen')
  }))
  vi.doMock('../../../src/components/Layout/Layout', async () => {
    const { Outlet } = await import('react-router-dom')
    return {
      Layout: () => createElement(Outlet)
    }
  })
  vi.doMock('../../../src/routes/ProtectedRoute', async () => {
    const { Outlet } = await import('react-router-dom')
    return {
      ProtectedRoute: () => createElement(Outlet)
    }
  })
}

const renderRootRouter = async (authInput: RootAuthInput): Promise<void> => {
  vi.resetModules()
  window.history.replaceState({}, '', '/')

  const authState = createAuthState({
    isAuthenticated: authInput.isAuthenticated,
    loading: authInput.loading ?? false,
    user: authInput.isAuthenticated ? { id: 'user-1', email: 'user@test.com' } : null
  })

  vi.doMock('../../../src/contexts/AuthContext', () => ({
    useAuth: () => authState
  }))
  mockRouteDependencies()

  const { default: RouterMain } = await import('../../../src/routes/RouterMain')
  render(createElement(RouterMain))
}

describe('Root route redirect integration', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('redirects unauthenticated users from / to /login', async () => {
    await renderRootRouter({ isAuthenticated: false })

    expect(await screen.findByText('Login Route Screen')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('redirects authenticated users from / to /chat', async () => {
    await renderRootRouter({ isAuthenticated: true })

    expect(await screen.findByText('Chat Route Screen')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/chat')
  })

  it('shows loading state while root auth check is in progress', async () => {
    await renderRootRouter({ isAuthenticated: false, loading: true })

    expect(await screen.findByText('Carregando sessao...')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })
})
