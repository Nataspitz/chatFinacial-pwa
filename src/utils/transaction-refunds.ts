import type { RefundScope, Transaction } from '../types/transaction.types'

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

export const getRefundTransactionTargets = (
  transactions: Transaction[],
  selected: Transaction,
  scope: RefundScope = 'single'
): Transaction[] => {
  const isInstallmentGroup = Boolean(selected.installmentGroupId && selected.installmentCount > 1)
  if (!isInstallmentGroup || !selected.installmentGroupId || scope === 'single') {
    return [selected]
  }

  return transactions.filter((item) => {
    if (item.installmentGroupId !== selected.installmentGroupId) return false
    if (scope === 'group') return true
    return normalizeDate(item.date) >= normalizeDate(selected.date)
  })
}
