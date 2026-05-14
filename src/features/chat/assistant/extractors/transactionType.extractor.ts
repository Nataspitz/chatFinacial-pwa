import type { AssistantTransactionType } from '../types'
import { hasAny, normalizeText } from '../core/normalizeText'
import { expenseWords, incomeWords } from '../vocabulary/transactionTypes.vocabulary'

export const extractTransactionType = (message: string): AssistantTransactionType | null => {
  const text = normalizeText(message)
  const income = hasAny(text, incomeWords)
  const expense = hasAny(text, expenseWords)

  if (income && !expense) return 'income'
  if (expense && !income) return 'expense'

  if (text.includes('quanto gastei')) return 'expense'
  if (text.includes('quanto recebi') || text.includes('quanto entrou')) return 'income'

  return null
}

