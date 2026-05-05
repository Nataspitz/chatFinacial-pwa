import type { FinancialMonthlySummary } from '../../../types/financial-summary.types'
import type { PerformanceOverviewPoint, PeriodTotals, TimePoint } from '../types'

export const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatPercent = (value: number | null): string => {
  if (value === null) return 'N/D'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export const toMonthRef = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}-01`

export const isValidYearSummary = (summaries: FinancialMonthlySummary[], year: number): boolean => {
  if (summaries.length !== 12) return false
  return Array.from({ length: 12 }, (_, index) => toMonthRef(year, index + 1)).every((monthRef) => {
    const summary = summaries.find((item) => item.monthRef === monthRef)
    return Boolean(summary?.calculatedAt)
  })
}

export const getSummaryMonth = (
  summaries: FinancialMonthlySummary[],
  year: number,
  month: number
): FinancialMonthlySummary | null => summaries.find((item) => item.monthRef === toMonthRef(year, month)) ?? null

export const toPeriodTotals = (summary: FinancialMonthlySummary | null): PeriodTotals => ({
  revenue: summary?.totalEntries ?? 0,
  expense: summary?.totalOutcomes ?? 0,
  profit: summary?.resultBalance ?? 0
})

export const sumSummaryTotals = (summaries: FinancialMonthlySummary[]): PeriodTotals => {
  const revenue = summaries.reduce((acc, item) => acc + item.totalEntries, 0)
  const expense = summaries.reduce((acc, item) => acc + item.totalOutcomes, 0)
  return { revenue, expense, profit: revenue - expense }
}

export const buildSummaryCurrentYearSeries = (
  summaries: FinancialMonthlySummary[],
  year: number,
  currentMonth: number
): PerformanceOverviewPoint[] =>
  Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const summary = getSummaryMonth(summaries, year, month)
    const isFutureMonth = month > currentMonth
    return {
      label: MONTH_NAMES[index],
      revenue: isFutureMonth ? 0 : summary?.totalEntries ?? 0,
      expense: isFutureMonth ? 0 : summary?.totalOutcomes ?? 0,
      profit: isFutureMonth ? 0 : summary?.resultBalance ?? 0,
      cumulativeProfit: isFutureMonth ? 0 : summary?.accountBalance ?? 0
    }
  })

export const buildSummaryLineSeries = (summaries: FinancialMonthlySummary[]): TimePoint[] =>
  summaries.map((summary) => {
    const year = Number(summary.monthRef.slice(0, 4))
    const month = Number(summary.monthRef.slice(5, 7))
    return {
      label: `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`,
      revenue: summary.totalEntries,
      expense: summary.totalOutcomes,
      profit: summary.resultBalance,
      year,
      month
    }
  })
