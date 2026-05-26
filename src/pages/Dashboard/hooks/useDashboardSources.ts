import { useCallback, useEffect, useState } from 'react'
import { businessService, type BusinessSettings } from '../../../services/business.service'
import { financialSummaryService } from '../../../services/financial-summary.service'
import { financeService } from '../../../services/finance.service'
import type { FinancialMonthlySummary } from '../../../types/financial-summary.types'
import { shouldAffectFinancialReports } from '../../../utils/transaction-reports'
import { parseTransactionDate } from '../dashboard-calculations'
import { toMonthRef } from './dashboard-summary.utils'
import type { NormalizedTransaction, PeriodTotals } from '../types'

const normalizeDashboardTransactions = (transactions: Awaited<ReturnType<typeof financeService.getTransactions>>): NormalizedTransaction[] =>
  transactions
    .filter(shouldAffectFinancialReports)
    .map((item) => {
      const parsedDate = parseTransactionDate(item.date)
      return parsedDate
        ? {
            ...item,
            parsedDate,
            year: parsedDate.getFullYear(),
            month: parsedDate.getMonth() + 1,
            day: parsedDate.getDate()
          }
        : null
    })
    .filter((item): item is NormalizedTransaction => item !== null)

const MONEY_TOLERANCE = 0.01

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const isOpenFutureTransaction = (dateValue: string, isConfirmed: boolean, todayDate: string): boolean =>
  dateValue > todayDate && !isConfirmed

const calculateReportMonthTotals = (
  transactions: NormalizedTransaction[],
  year: number,
  month: number,
  todayDate: string
): PeriodTotals => {
  return transactions.reduce<PeriodTotals>((totals, item) => {
    let occurrenceDate = item.date.slice(0, 10)
    let occurrenceConfirmed = item.isConfirmed

    if (!(item.year === year && item.month === month)) {
      if (item.type !== 'saida' || !item.isMonthlyCost) {
        return totals
      }

      const isAfterStartMonth = year > item.year || (year === item.year && month >= item.month)
      if (!isAfterStartMonth) {
        return totals
      }

      const lastDayInTargetMonth = new Date(year, month, 0).getDate()
      const adjustedDay = Math.min(item.day, lastDayInTargetMonth)
      occurrenceDate = `${year}-${String(month).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`
      if (item.monthlyEndDate && occurrenceDate > item.monthlyEndDate) {
        return totals
      }
      occurrenceConfirmed = Boolean(item.isConfirmed) && occurrenceDate <= todayDate
    }

    if (isOpenFutureTransaction(occurrenceDate, occurrenceConfirmed, todayDate)) {
      return totals
    }

    if (item.type === 'entrada') {
      totals.revenue += item.amount
    } else {
      totals.expense += item.amount
    }
    totals.profit = totals.revenue - totals.expense
    return totals
  }, { revenue: 0, expense: 0, profit: 0 })
}

const amountsDiffer = (left: number, right: number): boolean => Math.abs(left - right) > MONEY_TOLERANCE

const summariesDifferFromReport = (
  summaries: FinancialMonthlySummary[],
  transactions: NormalizedTransaction[],
  year: number
): boolean => {
  if (summaries.length !== 12) {
    return true
  }

  const todayDate = toIsoDate(new Date())
  return Array.from({ length: 12 }, (_, index) => index + 1).some((month) => {
    const summary = summaries.find((item) => item.monthRef === toMonthRef(year, month))
    if (!summary) {
      return true
    }

    const totals = calculateReportMonthTotals(transactions, year, month, todayDate)
    return (
      amountsDiffer(summary.totalEntries, totals.revenue)
      || amountsDiffer(summary.totalOutcomes, totals.expense)
      || amountsDiffer(summary.resultBalance, totals.profit)
    )
  })
}

export const useDashboardSources = (currentYear: number, selectedYear: number) => {
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([])
  const [summariesByYear, setSummariesByYear] = useState<Record<number, FinancialMonthlySummary[]>>({})
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true)
  const [isBusinessLoading, setIsBusinessLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [isRefreshingSummaries, setIsRefreshingSummaries] = useState(false)
  const [summaryFeedback, setSummaryFeedback] = useState('')
  const [summaryFeedbackTone, setSummaryFeedbackTone] = useState<'success' | 'error'>('success')
  const [error, setError] = useState('')
  const [businessSettingsFailed, setBusinessSettingsFailed] = useState(false)

  const loadSources = useCallback(async (options: { includeBusiness?: boolean; silent?: boolean } = {}): Promise<void> => {
    const includeBusiness = options.includeBusiness ?? true
    const silent = options.silent ?? false

    if (!silent) {
      setIsTransactionsLoading(true)
      setIsSummaryLoading(true)
      if (includeBusiness) {
        setIsBusinessLoading(true)
      }
    }

    const [transactionsResult, businessResult, summaryResult] = await Promise.allSettled([
      financeService.getTransactions(),
      includeBusiness ? businessService.getBusinessSettings() : Promise.resolve(null),
      financialSummaryService.listYear(currentYear)
    ])

    const normalizedTransactions = transactionsResult.status === 'fulfilled'
      ? normalizeDashboardTransactions(transactionsResult.value)
      : []

    if (transactionsResult.status === 'fulfilled') {
      setTransactions(normalizedTransactions)
      setError('')
    } else {
      setError('Não foi possível carregar os dados da dashboard.')
    }

    if (includeBusiness) {
      if (businessResult.status === 'fulfilled') {
        setBusinessSettings(businessResult.value)
        setBusinessSettingsFailed(false)
      } else {
        setBusinessSettings(null)
        setBusinessSettingsFailed(true)
      }
    }

    if (summaryResult.status === 'fulfilled') {
      const currentSummaries = summaryResult.value
      if (
        transactionsResult.status === 'fulfilled'
        && summariesDifferFromReport(currentSummaries, normalizedTransactions, currentYear)
      ) {
        try {
          const refreshed = await financialSummaryService.refreshYear(currentYear)
          setSummariesByYear((prev) => ({ ...prev, [currentYear]: refreshed }))
        } catch {
          setSummariesByYear((prev) => ({ ...prev, [currentYear]: currentSummaries }))
        }
      } else {
        setSummariesByYear((prev) => ({ ...prev, [currentYear]: currentSummaries }))
      }
    }

    setIsTransactionsLoading(false)
    setIsSummaryLoading(false)
    if (includeBusiness) {
      setIsBusinessLoading(false)
    }
  }, [currentYear])

  useEffect(() => {
    void loadSources()
  }, [loadSources])

  useEffect(() => {
    const handleBusinessSettingsUpdated = (): void => {
      void businessService
        .getBusinessSettings()
        .then((settings) => {
          setBusinessSettings(settings)
          setBusinessSettingsFailed(false)
        })
        .catch(() => undefined)
    }

    window.addEventListener('business-settings-updated', handleBusinessSettingsUpdated)
    return () => window.removeEventListener('business-settings-updated', handleBusinessSettingsUpdated)
  }, [])

  useEffect(() => {
    const handleFinancialDataUpdated = (): void => {
      void loadSources({ includeBusiness: false, silent: true })
    }

    window.addEventListener('financial-data-updated', handleFinancialDataUpdated)
    return () => window.removeEventListener('financial-data-updated', handleFinancialDataUpdated)
  }, [loadSources])

  useEffect(() => {
    if (summariesByYear[selectedYear]) return

    let isMounted = true
    void financialSummaryService
      .listYear(selectedYear)
      .then((summaries) => {
        if (isMounted) setSummariesByYear((prev) => ({ ...prev, [selectedYear]: summaries }))
      })
      .catch(() => {
        if (isMounted) setSummariesByYear((prev) => ({ ...prev, [selectedYear]: [] }))
      })

    return () => {
      isMounted = false
    }
  }, [selectedYear, summariesByYear])

  const refreshSummaries = async (): Promise<void> => {
    setIsRefreshingSummaries(true)
    setSummaryFeedback('')
    try {
      const refreshed = await financialSummaryService.refreshYear(selectedYear)
      setSummariesByYear((prev) => ({ ...prev, [selectedYear]: refreshed }))
      setSummaryFeedback('Resumo financeiro atualizado.')
      setSummaryFeedbackTone('success')
    } catch {
      setSummaryFeedback('Não foi possível atualizar o resumo financeiro.')
      setSummaryFeedbackTone('error')
    } finally {
      setIsRefreshingSummaries(false)
    }
  }

  return {
    transactions,
    summariesByYear,
    businessSettings,
    isLoading: isTransactionsLoading || isBusinessLoading || isSummaryLoading,
    error,
    businessSettingsFailed,
    isRefreshingSummaries,
    refreshSummaries,
    summaryFeedback,
    summaryFeedbackTone
  }
}
