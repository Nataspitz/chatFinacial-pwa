import type { TransactionType } from '../types/transaction.types'

export const GENERAL_TRANSACTION_CATEGORY = 'Geral'

export interface TransactionCategoryOption {
  id: string
  type: TransactionType
  name: string
}

export const normalizeTransactionCategory = (value: string): string =>
  value.trim().replace(/\s+/g, ' ')

export const resolveTransactionCategory = (value?: string | null): string => {
  const normalized = normalizeTransactionCategory(value ?? '')
  return normalized || GENERAL_TRANSACTION_CATEGORY
}

export const getDefaultTransactionCategory = (): string => GENERAL_TRANSACTION_CATEGORY

export const isGeneralTransactionCategory = (value?: string | null): boolean =>
  normalizeTransactionCategory(value ?? '').toLocaleLowerCase('pt-BR') ===
  GENERAL_TRANSACTION_CATEGORY.toLocaleLowerCase('pt-BR')

export const ensureGeneralCategoryOption = <T extends TransactionCategoryOption>(
  items: T[],
  type: TransactionType
): T[] => {
  const hasGeneral = items.some((item) => isGeneralTransactionCategory(item.name))
  const nextItems = hasGeneral
    ? [...items]
    : [
        {
          id: `system-${type}-geral`,
          type,
          name: GENERAL_TRANSACTION_CATEGORY
        } as T,
        ...items
      ]

  return nextItems.sort((left, right) => {
    if (isGeneralTransactionCategory(left.name)) return -1
    if (isGeneralTransactionCategory(right.name)) return 1
    return left.name.localeCompare(right.name, 'pt-BR')
  })
}
