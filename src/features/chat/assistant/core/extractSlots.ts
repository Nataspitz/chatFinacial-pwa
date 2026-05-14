import type { AssistantEntities, AssistantIntent, AssistantPeriod } from '../types'
import { extractAmount } from '../extractors/amount.extractor'
import { extractCategory, toCategoryHint } from '../extractors/category.extractor'
import { extractDatePeriod } from '../extractors/date.extractor'
import { extractDescription } from '../extractors/description.extractor'
import { extractPaymentMethod } from '../extractors/paymentMethod.extractor'
import { extractTransactionType } from '../extractors/transactionType.extractor'

const isSingleDay = (period: AssistantPeriod): boolean => period.start === period.end

const extractValueRange = (message: string): { minAmount?: number; maxAmount?: number } => {
  const untilMatch = message.match(/(?:ate|no maximo)\s+r?\$?\s*(\d+(?:[.,]\d{1,2})?)/)
  const fromMatch = message.match(/(?:acima de|maior que|a partir de)\s+r?\$?\s*(\d+(?:[.,]\d{1,2})?)/)
  const betweenMatch = message.match(
    /(?:entre)\s+r?\$?\s*(\d+(?:[.,]\d{1,2})?)\s+(?:e|ate)\s+r?\$?\s*(\d+(?:[.,]\d{1,2})?)/
  )

  const parse = (raw?: string): number | undefined => {
    if (!raw) return undefined
    const normalized = raw.includes(',') ? raw.replace(',', '.') : raw
    const value = Number(normalized)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  if (betweenMatch?.[1] && betweenMatch[2]) {
    return { minAmount: parse(betweenMatch[1]), maxAmount: parse(betweenMatch[2]) }
  }

  return { minAmount: parse(fromMatch?.[1]), maxAmount: parse(untilMatch?.[1]) }
}

export const extractSlots = (
  message: string,
  intent: AssistantIntent,
  referenceDate = new Date()
): AssistantEntities => {
  const period = extractDatePeriod(message, referenceDate) ?? undefined
  const type = extractTransactionType(message) ?? undefined
  const amount = extractAmount(message) ?? undefined
  const description = extractDescription(message) ?? undefined
  const category = extractCategory(message)
  const categoryHint = toCategoryHint(category) ?? undefined
  const paymentMethod = extractPaymentMethod(message) ?? undefined
  const range = extractValueRange(message)

  if (intent === 'create_transaction') {
    return {
      type,
      amount,
      description,
      paymentMethod,
      date: period && isSingleDay(period) ? period.start : undefined,
      categoryHint
    }
  }

  if (intent === 'list_transactions' || intent === 'show_summary' || intent === 'show_balance' || intent === 'analyze_transactions') {
    const hasDescriptionFilter = /\b(descricao|descri[cç]ao|texto)\b/.test(message.toLowerCase())

    return {
      period,
      type,
      paymentMethod,
      description: hasDescriptionFilter ? description : undefined,
      categoryHint,
      minAmount: range.minAmount,
      maxAmount: range.maxAmount
    }
  }

  return {}
}
