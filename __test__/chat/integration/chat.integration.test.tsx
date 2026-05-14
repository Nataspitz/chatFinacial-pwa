import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chat } from '../../../src/pages/Chat/Chat'

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}))

vi.mock('../../../src/features/chat/assistant', async () => {
  const actual = await vi.importActual<typeof import('../../../src/features/chat/assistant')>(
    '../../../src/features/chat/assistant'
  )
  return {
    ...actual,
    handleChatMessage: vi.fn(async () => ({
      response: {
        type: 'question',
        message: 'De qual período você quer listar as transações?',
        missingSlot: 'period'
      },
      session: {
        userId: 'user-1',
        pendingIntent: 'list_transactions',
        slots: {},
        missingSlots: ['period'],
        draft: null,
        updatedAt: '2026-05-12T12:00:00.000Z'
      }
    }))
  }
})

describe('Chat integration', () => {
  it('renderiza resposta inicial e envia mensagem ao assistente', async () => {
    render(<Chat />)

    expect(screen.getByText(/Posso te ajudar a criar uma transação/)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Digite aqui...'), {
      target: { value: 'quero listar transacoes' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => {
      expect(screen.getByText('De qual período você quer listar as transações?')).toBeInTheDocument()
    })
  })
})
