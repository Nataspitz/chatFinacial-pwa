import type { Transaction } from './transaction.types'

export type FinancialNotificationType =
  | 'INCOME_TODAY'
  | 'INCOME_UPCOMING'
  | 'INCOME_OVERDUE'
  | 'PAYMENT_DUE'
  | 'PAYMENT_UPCOMING'
  | 'PAYMENT_OVERDUE'
  | 'MONTHLY_COST_DUE'
  | 'AUDIT_REMINDER'
  | 'UNCATEGORIZED_TRANSACTION'

export type FinancialNotificationTone = 'income' | 'payment' | 'overdue' | 'audit' | 'warning'

export interface FinancialNotification {
  id: string
  type: FinancialNotificationType
  tone: FinancialNotificationTone
  title: string
  description: string
  date: string
  amount: number | null
  count: number
  transactionIds: string[]
  transactions: Transaction[]
  action: 'confirm-income' | 'confirm-payment' | 'open-report' | 'open-audit' | null
}
