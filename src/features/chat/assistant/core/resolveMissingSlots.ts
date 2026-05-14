import type { AssistantEntities, AssistantIntent, MissingSlot } from '../types'

const createPriority: MissingSlot[] = ['amount', 'type', 'description', 'date']

export const getMissingSlots = (intent: AssistantIntent, slots: AssistantEntities): MissingSlot[] => {
  if (intent === 'create_transaction') {
    return createPriority.filter((slot) => {
      if (slot === 'amount') return !slots.amount || slots.amount <= 0
      if (slot === 'type') return !slots.type
      if (slot === 'description') return !slots.description?.trim()
      if (slot === 'date') return !slots.date
      return false
    })
  }

  if (intent === 'show_summary' || intent === 'show_balance') {
    return slots.period ? [] : ['period']
  }

  return []
}

export const askForMissingSlot = (slot: MissingSlot, intent: AssistantIntent): string => {
  if (slot === 'period' && intent === 'list_transactions') {
    return 'De qual período você quer listar as transações?'
  }
  if (slot === 'period' && intent === 'show_summary') {
    return 'De qual período você quer ver o resumo?'
  }
  if (slot === 'period' && intent === 'show_balance') {
    return 'De qual período você quer consultar o saldo?'
  }

  if (slot === 'amount') return 'Qual foi o valor da transação?'
  if (slot === 'type') return 'Isso foi uma entrada ou uma despesa?'
  if (slot === 'description') return 'Qual descrição você quer usar?'
  if (slot === 'date') return 'Qual foi a data da transação?'
  if (slot === 'paymentMethod') return 'Qual foi a forma de pagamento?'
  return 'Qual dado falta para continuar?'
}
