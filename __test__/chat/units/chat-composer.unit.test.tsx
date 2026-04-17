import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chat } from '../../../src/pages/Chat/Chat'
import type { ChatReply, GuidedStep } from '../../../src/types/chat.types'

const getInitialReplyMock = vi.fn()
const getInitialSessionMock = vi.fn()
const processMessageMock = vi.fn()

vi.mock('../../../src/services/chat.service', () => ({
  chatService: {
    getInitialReply: () => getInitialReplyMock(),
    getInitialSession: () => getInitialSessionMock(),
    processMessage: (message: string, session: unknown) => processMessageMock(message, session)
  }
}))

const buildReply = (step: GuidedStep): ChatReply => ({
  content: 'Mensagem inicial',
  actions: [],
  nextSession: { step } as never
})

describe('Chat composer visibility', () => {
  it('mostra textarea quando o fluxo exige entrada de texto', () => {
    getInitialReplyMock.mockReturnValue(buildReply('collect_transaction_amount'))
    getInitialSessionMock.mockReturnValue({ step: 'collect_transaction_amount' })

    render(<Chat />)

    expect(screen.getByPlaceholderText('Digite aqui...')).toBeInTheDocument()
  })

  it('oculta textarea no menu principal com acoes rapidas', () => {
    getInitialReplyMock.mockReturnValue({
      content: 'Menu',
      actions: [{ id: '1', label: 'Acao', value: '/menu' }],
      nextSession: { step: 'main_menu' }
    })
    getInitialSessionMock.mockReturnValue({ step: 'main_menu' })

    render(<Chat />)

    expect(screen.queryByPlaceholderText('Digite aqui...')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acao' })).toBeInTheDocument()
  })
})
