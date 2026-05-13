/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from '../../../src/pages/Login/Login'
import { createAuthState, getUseAuthMock } from '../mocks/auth-context.mock'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

const renderLogin = (initialEntry: string | { pathname: string; state?: unknown } = '/login'): void => {
  render(
    <MemoryRouter initialEntries={[initialEntry as never]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<div>Chat page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Login - integration auth flow', () => {
  const useAuthMock = getUseAuthMock()

  beforeEach(() => {
    useAuthMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('signs in and redirects to the original protected route from location state', async () => {
    const authState = createAuthState({
      signIn: vi.fn().mockResolvedValue(undefined)
    })
    useAuthMock.mockReturnValue(authState)
    const user = userEvent.setup()

    renderLogin({
      pathname: '/login',
      state: { from: { pathname: '/dashboard' } }
    })

    await user.type(screen.getByLabelText('E-mail'), '  user@test.com  ')
    await user.type(screen.getByLabelText('Senha'), 'StrongPass123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(authState.signIn).toHaveBeenCalledWith('user@test.com', 'StrongPass123')
    })
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('shows signup success notice and switches back to signin mode', async () => {
    const authState = createAuthState({
      signUp: vi.fn().mockResolvedValue(undefined)
    })
    useAuthMock.mockReturnValue(authState)
    const user = userEvent.setup()

    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Criar nova conta' }))

    await user.type(screen.getByLabelText('E-mail'), '  new.user@test.com ')
    await user.type(screen.getByLabelText('Senha'), 'Pass1234')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => {
      expect(authState.signUp).toHaveBeenCalledWith('new.user@test.com', 'Pass1234')
    })
    expect(
      await screen.findByText('Conta criada. Se o login não entrar, confirme o e-mail antes de acessar.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('shows signup error message when account creation fails', async () => {
    const authState = createAuthState({
      signUp: vi.fn().mockRejectedValue(new Error('Email ja cadastrado.'))
    })
    useAuthMock.mockReturnValue(authState)
    const user = userEvent.setup()

    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Criar nova conta' }))

    await user.type(screen.getByLabelText('E-mail'), 'existing@test.com')
    await user.type(screen.getByLabelText('Senha'), 'Pass1234')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Email ja cadastrado.')).toBeInTheDocument()
  })
})
