import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from '../../../src/pages/Login/Login'
import { createAuthContextMock } from '../../auth/mocks/auth-context.mock'

const useAuthMock = vi.fn()
const navigateMock = vi.fn()
const locationMock = vi.fn(() => ({ state: null }))

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock()
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => locationMock()
  }
})

describe('Login page integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    locationMock.mockReturnValue({ state: null })
  })

  it('valida campos obrigatorios antes de enviar', async () => {
    useAuthMock.mockReturnValue(createAuthContextMock())

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Preencha e-mail e senha para continuar.')).toBeInTheDocument()
  })

  it('realiza login e redireciona para rota de origem', async () => {
    const signIn = vi.fn(async () => undefined)
    useAuthMock.mockReturnValue(createAuthContextMock({ signIn }))
    locationMock.mockReturnValue({ state: { from: { pathname: '/report' } } })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: '  user@test.com  ' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('user@test.com', '123456'))
    expect(navigateMock).toHaveBeenCalledWith('/report', { replace: true })
  })

  it('suporta fluxo de cadastro com mensagem de sucesso', async () => {
    const signUp = vi.fn(async () => undefined)
    useAuthMock.mockReturnValue(createAuthContextMock({ signUp }))

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Criar nova conta' }))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'new@test.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'abc123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('new@test.com', 'abc123'))
    expect(
      await screen.findByText('Conta criada. Se o login não entrar, confirme o e-mail antes de acessar.')
    ).toBeInTheDocument()
  })

  it('mostra erro amigavel para credenciais invalidas', async () => {
    const signIn = vi.fn(async () => {
      throw { code: 'invalid_credentials' }
    })
    useAuthMock.mockReturnValue(createAuthContextMock({ signIn }))

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
  })
})
