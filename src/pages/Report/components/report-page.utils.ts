import type { ExportReportPdfTransaction } from '../../../types/report-export.types'
import type { Transaction } from '../../../types/transaction.types'
import { formatPaymentMethod } from './transactionTable.utils'
import type { ExportFormState } from './report-page.types'
import {
  addMonths,
  formatDate,
  getLastDayOfMonth,
  getMonthDiff,
  getSortableDateValue,
  getTodayDate,
  normalizeTransactionDate
} from './report-page.date-utils'

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback

export const normalizeCategoryValue = (value: string): string => value.trim().replace(/\s+/g, ' ')

export const splitAmountIntoInstallments = (totalAmount: number, count: number): number[] => {
  const totalInCents = Math.round(totalAmount * 100)
  const base = Math.floor(totalInCents / count)
  const remainder = totalInCents - base * count
  const result = Array.from({ length: count }, () => base)

  for (let i = 0; i < remainder; i += 1) {
    result[i] += 1
  }

  return result.map((item) => item / 100)
}

export const getExportDateRange = (form: ExportFormState): { startDate: string; endDate: string } => {
  if (form.periodType === 'year') {
    return { startDate: `${form.year}-01-01`, endDate: `${form.year}-12-31` }
  }

  if (form.periodType === 'month') {
    return { startDate: `${form.year}-${form.month}-01`, endDate: getLastDayOfMonth(form.year, form.month) }
  }

  if (form.periodType === 'monthRange') {
    return {
      startDate: `${form.year}-${form.month}-${form.startDay}`,
      endDate: `${form.year}-${form.month}-${form.endDay}`
    }
  }

  const selectedDate = `${form.year}-${form.month}-${form.day}`
  return { startDate: selectedDate, endDate: selectedDate }
}

const getTransactionBalanceSignal = (transaction: Transaction): number => transaction.type === 'entrada' ? 1 : -1

const getEarliestConfirmedTransactionDate = (transactions: Transaction[]): string | null => {
  const dates = transactions
    .filter((transaction) => transaction.isConfirmed)
    .map((transaction) => normalizeTransactionDate(transaction.date))
    .filter((date): date is string => Boolean(date))
    .sort()

  return dates[0] ?? null
}

const getConfirmedTransactionAmountAt = (
  transaction: Transaction,
  baseDate: string,
  targetDate: string,
  todayDate: string
): number => {
  const normalizedDate = normalizeTransactionDate(transaction.date)
  if (!normalizedDate || normalizedDate > targetDate || normalizedDate > todayDate) return 0

  if (transaction.type === 'saida' && transaction.isMonthlyCost) {
    const monthDiff = getMonthDiff(normalizedDate, targetDate)
    if (monthDiff < 0) return 0

    let total = 0
    for (let offset = 0; offset <= monthDiff; offset += 1) {
      const occurrenceDate = addMonths(normalizedDate, offset)
      if (transaction.monthlyEndDate && occurrenceDate > transaction.monthlyEndDate) {
        continue
      }
      if (occurrenceDate >= baseDate && occurrenceDate <= targetDate && occurrenceDate <= todayDate && transaction.isConfirmed) {
        total += transaction.amount
      }
    }

    return getTransactionBalanceSignal(transaction) * total
  }

  if (!transaction.isConfirmed || normalizedDate < baseDate) return 0
  return getTransactionBalanceSignal(transaction) * transaction.amount
}

export const calculateAccountBalanceAt = (
  transactions: Transaction[],
  baseAmount: number,
  baseDate: string,
  targetDate: string
): number => {
  if (targetDate < baseDate) return baseAmount

  const todayDate = getTodayDate()
  return transactions.reduce((acc, transaction) => {
    const normalizedDate = normalizeTransactionDate(transaction.date)
    return normalizedDate ? acc + getConfirmedTransactionAmountAt(transaction, baseDate, targetDate, todayDate) : acc
  }, baseAmount)
}

export const resolveAccountBalanceBase = (
  transactions: Transaction[],
  configuredBaseAmount: number,
  configuredBaseDate: string
): { baseAmount: number; baseDate: string } => {
  const earliestConfirmedDate = getEarliestConfirmedTransactionDate(transactions)
  const normalizedConfiguredDate = normalizeTransactionDate(configuredBaseDate) ?? getTodayDate()

  if (!earliestConfirmedDate) return { baseAmount: configuredBaseAmount, baseDate: normalizedConfiguredDate }
  if (configuredBaseAmount === 0 && normalizedConfiguredDate > earliestConfirmedDate) {
    return { baseAmount: 0, baseDate: earliestConfirmedDate }
  }

  return { baseAmount: configuredBaseAmount, baseDate: normalizedConfiguredDate }
}

export const isTransactionInFuture = (transaction: Transaction, todayDate: string): boolean => {
  const normalizedDate = normalizeTransactionDate(transaction.date)
  return Boolean(normalizedDate && normalizedDate > todayDate && !transaction.isConfirmed)
}

export const getDefaultConfirmedByDate = (dateValue: string): boolean => {
  const normalizedDate = normalizeTransactionDate(dateValue)
  return normalizedDate ? normalizedDate <= getTodayDate() : true
}

const getInstallmentLabel = (transaction: Transaction): string => {
  if (transaction.paymentMethod !== 'credito') return 'Pagamento sem parcelas'
  if (transaction.installmentCount <= 1) return 'Crédito à vista'
  return `${transaction.installmentNumber}/${transaction.installmentCount} parcelas`
}

export const toExportReportPdfTransaction = (transaction: Transaction): ExportReportPdfTransaction => ({
  ...transaction,
  dateLabel: formatDate(transaction.date),
  amountLabel: formatCurrency(transaction.amount),
  totalAmountLabel: formatCurrency(transaction.totalAmount),
  paymentMethodLabel: formatPaymentMethod(transaction.paymentMethod),
  installmentLabel: getInstallmentLabel(transaction),
  paymentDetailsLabel:
    transaction.paymentMethod === 'credito' && transaction.installmentCount > 1
      ? `${formatPaymentMethod(transaction.paymentMethod)} - ${getInstallmentLabel(transaction)}`
      : formatPaymentMethod(transaction.paymentMethod)
})

const getSortableCreatedAtValue = (value?: string): number => {
  if (!value) return Number.MAX_SAFE_INTEGER
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

export const sortTransactionsByDateAsc = (items: Transaction[]): Transaction[] =>
  [...items].sort((a, b) => {
    const byDate = getSortableDateValue(a.date) - getSortableDateValue(b.date)
    if (byDate !== 0) return byDate
    const byCreatedAt = getSortableCreatedAtValue(a.createdAt) - getSortableCreatedAtValue(b.createdAt)
    return byCreatedAt !== 0 ? byCreatedAt : a.id.localeCompare(b.id)
  })
