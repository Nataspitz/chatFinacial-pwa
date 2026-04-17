import type { ChatReply } from '../../../src/types/chat.types'

export const initialChatReplyMock: ChatReply = {
  content: 'O que voce quer fazer?',
  actions: [
    {
      id: 'action-1',
      label: 'Ver transacoes',
      value: '/view/transactions'
    }
  ],
  nextSession: {
    step: 'main_menu'
  }
}
