import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '../../../src/routes/ProtectedRoute'
import { createAuthContextMock } from '../mocks/auth-context.mock'

const useAuthMock = vi.fn()

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock()
}))

describe('ProtectedRoute', () => {
  it('renderiza loading enquanto a sessao carrega', () => {
    useAuthMock.mockReturnValue(createAuthContextMock({ loading: true }))

    render(
      <MemoryRouter initialEntries={['/report']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/report" element={<div>Tela privada</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Carregando sessao...')).toBeInTheDocument()
  })

  it('redireciona para login quando nao autenticado', () => {
    useAuthMock.mockReturnValue(createAuthContextMock({ isAuthenticated: false, user: null }))

    render(
      <MemoryRouter initialEntries={['/report']}>
        <Routes>
          <Route path="/login" element={<div>Tela de login</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/report" element={<div>Tela privada</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Tela de login')).toBeInTheDocument()
    expect(screen.queryByText('Tela privada')).not.toBeInTheDocument()
  })

  it('libera acesso quando autenticado', () => {
    useAuthMock.mockReturnValue(
      createAuthContextMock({
        isAuthenticated: true,
        user: { id: 'user-1', email: 'auth@test.com' } as never
      })
    )

    render(
      <MemoryRouter initialEntries={['/report']}>
        <Routes>
          <Route path="/login" element={<div>Tela de login</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/report" element={<div>Tela privada</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Tela privada')).toBeInTheDocument()
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument()
  })
})
