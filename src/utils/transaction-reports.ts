import type { Transaction } from '../types/transaction.types'

export const isTransactionIgnoredInReports = (transaction: Transaction): boolean =>
  Boolean(transaction.ignoredInReports) || transaction.status === 'REIMBURSED'
