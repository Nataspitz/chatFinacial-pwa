import { extractAmount } from './extract-amount'
import { extractCategoryHint, extractDescription } from './extract-description'
import { extractPeriod } from './extract-period'
import { extractTransactionType } from './extract-transaction-type'
import type { AssistantEntities, AssistantIntent, AssistantPeriod } from './types'

const isSingleDayPeriod = (period: AssistantPeriod): boolean => period.start === period.end

export const extractEntities = (
  message: string,
  intent: AssistantIntent,
  referenceDate = new Date()
): AssistantEntities => {
  const period = extractPeriod(message, referenceDate) ?? undefined
  const type = extractTransactionType(message) ?? undefined
  const categoryHint = extractCategoryHint(message) ?? undefined

  if (intent === 'create_transaction') {
    return {
      amount: extractAmount(message) ?? undefined,
      type,
      description: extractDescription(message) ?? undefined,
      date: period && isSingleDayPeriod(period) ? period.start : undefined,
      categoryHint
    }
  }

  if (intent === 'show_balance') {
    return { period }
  }

  if (intent === 'show_summary') {
    return { period, type, categoryHint }
  }

  if (intent === 'list_transactions') {
    return { period, type, categoryHint }
  }

  return {}
}
