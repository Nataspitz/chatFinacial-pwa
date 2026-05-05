import type { Transaction } from '../../../types/transaction.types'
import { getDefaultConfirmedByDate } from './report-page.utils'
import { normalizeTransactionDate } from './report-page.date-utils'

export const buildMonthlyCostForPeriod = (
  transaction: Transaction,
  selectedYear: string,
  selectedMonth: string,
  selectedDay: string
): Transaction | null => {
  if (transaction.type !== 'saida' || !transaction.isMonthlyCost) return null
  if (selectedYear === 'all' || selectedMonth === 'all') return null

  const normalizedDate = normalizeTransactionDate(transaction.date)
  if (!normalizedDate) return null

  const [year, month, originalDay] = normalizedDate.split('-').map(Number)
  const targetYear = Number(selectedYear)
  const targetMonth = Number(selectedMonth)
  const normalizedEndDate = transaction.monthlyEndDate ? normalizeTransactionDate(transaction.monthlyEndDate) : null

  if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth)) return null

  const isAfterStartMonth = targetYear > year || (targetYear === year && targetMonth >= month)
  if (!isAfterStartMonth) return null

  const lastDayInTargetMonth = new Date(targetYear, targetMonth, 0).getDate()
  const adjustedDay = Math.min(originalDay, lastDayInTargetMonth)
  const adjustedDayLabel = String(adjustedDay).padStart(2, '0')
  const targetMonthLabel = String(targetMonth).padStart(2, '0')
  const targetDate = `${selectedYear}-${targetMonthLabel}-${adjustedDayLabel}`
  const matchDay = selectedDay === 'all' || adjustedDay === Number(selectedDay)

  if (normalizedEndDate && targetDate > normalizedEndDate) return null
  if (!matchDay) return null

  const isGeneratedOccurrence = targetDate !== normalizedDate
  const isConfirmed = isGeneratedOccurrence
    ? Boolean(transaction.isConfirmed) && getDefaultConfirmedByDate(targetDate)
    : transaction.isConfirmed

  return {
    ...transaction,
    date: targetDate,
    isConfirmed,
    monthlyCostStartDate: normalizedDate
  }
}
