import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chat } from '../../../src/pages/Chat/Chat'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}))

describe('Chat composer visibility', () => {
  it('mantem textarea disponivel para o assistente', () => {
    render(<Chat />)

    expect(screen.getByPlaceholderText('Digite aqui...')).toBeInTheDocument()
    expect(screen.getByText(/Posso te ajudar a criar uma transação/)).toBeInTheDocument()
  })
})
