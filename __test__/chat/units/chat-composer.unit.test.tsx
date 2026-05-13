import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chat } from '../../../src/pages/Chat/Chat'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}))

describe('Chat composer visibility', () => {
  it('mantém textarea disponível para o assistente determinístico', () => {
    render(<Chat />)

    expect(screen.getByPlaceholderText('Digite aqui...')).toBeInTheDocument()
    expect(screen.getByText(/Posso listar transações/)).toBeInTheDocument()
  })
})
