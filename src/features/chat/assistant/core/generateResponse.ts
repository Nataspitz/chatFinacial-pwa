import type { AssistantResponse } from '../types'

export const fallbackQuickActions = [
  { label: 'Criar transação', value: 'criar uma transacao' },
  { label: 'Listar este mês', value: 'listar transacoes deste mes' },
  { label: 'Resumo do mês', value: 'ver resumo do mes' },
  { label: 'Gastos por categoria', value: 'analisar gastos por categoria este mes' }
]

export const greetingResponse = (): AssistantResponse => ({
  type: 'text',
  message:
    'Olá. O que você quer fazer hoje? Posso te ajudar a criar uma transação, listar transações, analisar gastos ou ver um resumo financeiro.',
  quickActions: fallbackQuickActions
})

export const helpResponse = (): AssistantResponse => ({
  type: 'text',
  message:
    'Posso te ajudar com criação de transação, listagem com filtros, resumo financeiro e análise de gastos por categoria.',
  quickActions: fallbackQuickActions
})

export const unknownResponse = (): AssistantResponse => ({
  type: 'text',
  message:
    'Não consegui identificar exatamente o que você quer fazer, mas posso te ajudar com algumas opções: criar uma transação, listar transações, ver resumo do mês ou analisar gastos por categoria.',
  quickActions: fallbackQuickActions
})

export const confirmDraftResponse = (): AssistantResponse => ({
  type: 'question',
  message: 'Você quer confirmar ou cancelar essa transação?',
  quickActions: [
    { label: 'Confirmar', value: 'confirmar' },
    { label: 'Cancelar', value: 'cancelar' }
  ]
})
