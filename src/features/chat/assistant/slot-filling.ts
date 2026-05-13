import type { AssistantEntities, AssistantIntent, MissingSlot } from './types'

const CREATE_TRANSACTION_PRIORITY: MissingSlot[] = ['amount', 'type', 'description', 'date']

export const getMissingSlots = (intent: AssistantIntent, entities: AssistantEntities): MissingSlot[] => {
  if (intent === 'list_transactions' || intent === 'show_summary' || intent === 'show_balance') {
    return entities.period ? [] : ['period']
  }

  if (intent !== 'create_transaction') {
    return []
  }

  return CREATE_TRANSACTION_PRIORITY.filter((slot) => {
    if (slot === 'amount') return !entities.amount || entities.amount <= 0
    if (slot === 'type') return !entities.type
    if (slot === 'description') return !entities.description?.trim()
    if (slot === 'date') return !entities.date
    return false
  })
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

  return 'Qual informação falta para continuar?'
}
