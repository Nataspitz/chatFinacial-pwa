import type { AssistantTransactionType } from './types'
import { hasAny, normalizeText } from './normalize-text'

const expenseKeywords = [
  'gastei',
  'gasto',
  'gastos',
  'paguei',
  'pagamento',
  'comprei',
  'compra',
  'despesa',
  'despesas',
  'debito',
  'saida',
  'saidas',
  'mercado',
  'aluguel',
  'internet',
  'luz',
  'agua',
  'uber'
]

const incomeKeywords = [
  'recebi',
  'ganho',
  'ganhei',
  'entrou',
  'entrada',
  'entradas',
  'salario',
  'renda',
  'freela',
  'pix recebido',
  'pagamento recebido'
]

export const extractTransactionType = (message: string): AssistantTransactionType | null => {
  const text = normalizeText(message)
  const isIncome = hasAny(text, incomeKeywords)
  const isExpense = hasAny(text, expenseKeywords)

  if (isIncome && !isExpense) return 'income'
  if (isExpense && !isIncome) return 'expense'
  if (isIncome && text.includes('receb')) return 'income'
  if (isExpense && (text.includes('gastei') || text.includes('paguei') || text.includes('comprei'))) return 'expense'

  return null
}
