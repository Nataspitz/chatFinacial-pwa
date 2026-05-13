/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from '../../../src/pages/Login/Login'
import { createAuthState, getUseAuthMock } from '../mocks/auth-context.mock'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

const renderLogin = (): void => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/chat" element={<div>Chat page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Login - unit validation/error states', () => {
  const useAuthMock = getUseAuthMock()

  beforeEach(() => {
    useAuthMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows loading state while auth session is loading', () => {
    useAuthMock.mockReturnValue(createAuthState({ loading: true }))

    renderLogin()

    expect(screen.getByText('Carregando sessão...')).toBeInTheDocument()
  })

  it('validates empty credentials before calling signin', async () => {
    const authState = createAuthState()
    useAuthMock.mockReturnValue(authState)
    const user = userEvent.setup()

    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Preencha e-mail e senha para continuar.')).toBeInTheDocument()
    expect(authState.signIn).not.toHaveBeenCalled()
    expect(authState.signUp).not.toHaveBeenCalled()
  })

  it('maps invalid credentials errors to a short actionable message', async () => {
    const authState = createAuthState({
      signIn: vi.fn().mockRejectedValue({ code: 'invalid_credentials' })
    })
    useAuthMock.mockReturnValue(authState)
    const user = userEvent.setup()

    renderLogin()
    await user.type(screen.getByLabelText('E-mail'), 'user@test.com')
    await user.type(screen.getByLabelText('Senha'), 'invalid-pass')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
    expect(authState.signIn).toHaveBeenCalledTimes(1)
  })
})
