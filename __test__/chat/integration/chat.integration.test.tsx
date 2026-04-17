import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chat } from '../../../src/pages/Chat/Chat'
import { initialChatReplyMock } from '../mocks/chat-service.mock'

const processMessageMock = vi.fn()
const getInitialReplyMock = vi.fn()
const getInitialSessionMock = vi.fn()

vi.mock('../../../src/services/chat.service', () => ({
  chatService: {
    getInitialReply: () => getInitialReplyMock(),
    getInitialSession: () => getInitialSessionMock(),
    processMessage: (message: string, session: unknown) => processMessageMock(message, session)
  }
}))

describe('Chat integration', () => {
  it('renderiza resposta inicial e processa acao rapida', async () => {
    getInitialReplyMock.mockReturnValue(initialChatReplyMock)
    getInitialSessionMock.mockReturnValue({ step: 'main_menu' })
    processMessageMock.mockResolvedValue({
      content: 'Aqui esta o resumo.',
      actions: [],
      nextSession: { step: 'main_menu' }
    })

    render(<Chat />)

    expect(screen.getByText('O que voce quer fazer?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver transacoes' }))

    await waitFor(() => {
      expect(processMessageMock).toHaveBeenCalledWith('/view/transactions', { step: 'main_menu' })
    })

    expect(await screen.findByText('Aqui esta o resumo.')).toBeInTheDocument()
  })
})
