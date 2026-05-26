import type { Transaction } from '../types/transaction.types'

const normalizeStatus = (status: Transaction['status']): string => String(status ?? 'active').toLowerCase()

export const isTransactionIgnoredInReports = (transaction: Transaction): boolean =>
  Boolean(transaction.ignoredInReports) || ['refunded', 'canceled', 'reimbursed'].includes(normalizeStatus(transaction.status))

export const shouldAffectFinancialReports = (transaction: Transaction): boolean =>
  !transaction.deletedAt && !isTransactionIgnoredInReports(transaction)

export const getFinancialReportAmount = (transaction: Transaction): number =>
  shouldAffectFinancialReports(transaction) ? transaction.amount : 0

export const isRefundedOrCanceled = (transaction: Transaction): boolean =>
  isTransactionIgnoredInReports(transaction)

export const getTransactionStatusLabel = (transaction: Transaction): string | null => {
  const status = normalizeStatus(transaction.status)
  if (status === 'refunded' || status === 'reimbursed') return 'Reembolsada'
  if (status === 'canceled') return 'Anulada'
  if (isTransactionIgnoredInReports(transaction)) return 'Anulada'
  return null
}
