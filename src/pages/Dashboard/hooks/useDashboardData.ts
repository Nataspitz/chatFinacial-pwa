import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { businessService, type BusinessSettings } from '../../../services/business.service'
import { financialSummaryService } from '../../../services/financial-summary.service'
import { financeService } from '../../../services/finance.service'
import {
  buildPerformanceOverviewSeries,
  buildLastNYearsSeries,
  buildLast12MonthsSeries,
  buildLastNPeriodProfits,
  calculateAccumulatedProfit,
  calculateGrowthPercent,
  calculateMargin,
  calculateMovingAverage,
  calculatePeriodTotals,
  calculateRoi,
  getPeriodTransactions,
  getPreviousPeriod,
  parseTransactionDate
} from '../dashboard-calculations'
import type { DashboardViewMode, HealthSnapshot, NormalizedTransaction, PerformanceOverviewPoint, PeriodTotals, TimePoint } from '../types'
import type { FinancialMonthlySummary } from '../../../types/financial-summary.types'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatPercent = (value: number | null): string => {
  if (value === null) {
    return 'N/D'
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const toMonthRef = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}-01`

const isValidYearSummary = (summaries: FinancialMonthlySummary[], year: number): boolean => {
  if (summaries.length !== 12) {
    return false
  }

  return Array.from({ length: 12 }, (_, index) => toMonthRef(year, index + 1)).every((monthRef) => {
    const summary = summaries.find((item) => item.monthRef === monthRef)
    return Boolean(summary?.calculatedAt)
  })
}

const getSummaryMonth = (
  summaries: FinancialMonthlySummary[],
  year: number,
  month: number
): FinancialMonthlySummary | null => summaries.find((item) => item.monthRef === toMonthRef(year, month)) ?? null

const toPeriodTotals = (summary: FinancialMonthlySummary | null): PeriodTotals => ({
  revenue: summary?.totalEntries ?? 0,
  expense: summary?.totalOutcomes ?? 0,
  profit: summary?.resultBalance ?? 0
})

const sumSummaryTotals = (summaries: FinancialMonthlySummary[]): PeriodTotals => {
  const revenue = summaries.reduce((acc, item) => acc + item.totalEntries, 0)
  const expense = summaries.reduce((acc, item) => acc + item.totalOutcomes, 0)
  return {
    revenue,
    expense,
    profit: revenue - expense
  }
}

const buildSummaryCurrentYearSeries = (
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

const buildSummaryLineSeries = (summaries: FinancialMonthlySummary[]): TimePoint[] =>
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

interface UseDashboardDataResult {
  accumulatedProfit: number
  availableYears: number[]
  businessSettingsFailed: boolean
  performanceOverviewCurrentYearSeries: ReturnType<typeof buildPerformanceOverviewSeries>
  performanceOverviewTotalAnnualSeries: ReturnType<typeof buildPerformanceOverviewSeries>
  performanceOverviewCurrentYear: number
  currentTotals: ReturnType<typeof calculatePeriodTotals>
  error: string
  executiveCurrentTotals: ReturnType<typeof calculatePeriodTotals>
  executiveMargin: number | null
  expenseGrowth: number | null
  hasDataInSelection: boolean
  healthSnapshot: HealthSnapshot
  investmentAmount: number | null
  isHelpPanelOpen: boolean
  isLoading: boolean
  isValuesVisible: boolean
  lineSeries: ReturnType<typeof buildLast12MonthsSeries>
  mode: DashboardViewMode
  periodLabel: string
  profitVariationAmount: number
  profitVariation: number | null
  revenueGrowth: number | null
  roi: number | null
  selectedMonth: number
  selectedYear: number
  shouldShowEmptyState: boolean
  shouldShowLoadedContent: boolean
  withPrivacyMask: (value: string) => string
  setMode: (value: DashboardViewMode) => void
  setSelectedYear: (value: number) => void
  setSelectedMonth: (value: number) => void
  setIsValuesVisible: Dispatch<SetStateAction<boolean>>
  toggleHelpPanel: () => void
  closeHelpPanel: () => void
  formatCurrency: (value: number) => string
  formatPercent: (value: number | null) => string
  isRefreshingSummaries: boolean
  refreshSummaries: () => Promise<void>
  summaryFeedback: string
  summaryFeedbackTone: 'success' | 'error'
  summarySource: 'database' | 'fallback'
}

export const useDashboardData = (): UseDashboardDataResult => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [mode, setMode] = useState<DashboardViewMode>('monthly')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
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
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
  const [isValuesVisible, setIsValuesVisible] = useState(true)

  useEffect(() => {
    void (async () => {
      const [transactionsResult, businessResult, summaryResult] = await Promise.allSettled([
        financeService.getTransactions(),
        businessService.getBusinessSettings(),
        financialSummaryService.listYear(currentYear)
      ])

      if (transactionsResult.status === 'fulfilled') {
        const normalized = transactionsResult.value
          .map((item) => {
            const parsedDate = parseTransactionDate(item.date)
            if (!parsedDate) {
              return null
            }

            return {
              ...item,
              parsedDate,
              year: parsedDate.getFullYear(),
              month: parsedDate.getMonth() + 1,
              day: parsedDate.getDate()
            } satisfies NormalizedTransaction
          })
          .filter((item): item is NormalizedTransaction => item !== null)

        setTransactions(normalized)
      } else {
        setError('Nao foi possivel carregar os dados da dashboard.')
      }

      if (businessResult.status === 'fulfilled') {
        setBusinessSettings(businessResult.value)
        setBusinessSettingsFailed(false)
      } else {
        setBusinessSettings(null)
        setBusinessSettingsFailed(true)
      }

      if (summaryResult.status === 'fulfilled') {
        setSummariesByYear((prev) => ({ ...prev, [currentYear]: summaryResult.value }))
      }

      setIsTransactionsLoading(false)
      setIsBusinessLoading(false)
      setIsSummaryLoading(false)
    })()
  }, [currentYear])

  useEffect(() => {
    const handleBusinessSettingsUpdated = (): void => {
      void (async () => {
        try {
          const settings = await businessService.getBusinessSettings()
          setBusinessSettings(settings)
          setBusinessSettingsFailed(false)
        } catch {
          // Mantem estado atual quando nao for possivel recarregar.
        }
      })()
    }

    window.addEventListener('business-settings-updated', handleBusinessSettingsUpdated)
    return () => {
      window.removeEventListener('business-settings-updated', handleBusinessSettingsUpdated)
    }
  }, [])

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(transactions.map((item) => item.year))).sort((a, b) => b - a)
    return years.length ? years : [currentYear]
  }, [transactions, currentYear])

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  useEffect(() => {
    if (summariesByYear[selectedYear]) {
      return
    }

    let isMounted = true
    void (async () => {
      try {
        const summaries = await financialSummaryService.listYear(selectedYear)
        if (isMounted) {
          setSummariesByYear((prev) => ({ ...prev, [selectedYear]: summaries }))
        }
      } catch {
        if (isMounted) {
          setSummariesByYear((prev) => ({ ...prev, [selectedYear]: [] }))
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [selectedYear, summariesByYear])

  const currentPeriodTransactions = useMemo(() => {
    return getPeriodTransactions(transactions, mode, selectedYear, selectedMonth)
  }, [transactions, mode, selectedYear, selectedMonth])

  const previousPeriod = useMemo(
    () => getPreviousPeriod(mode, selectedYear, selectedMonth),
    [mode, selectedYear, selectedMonth]
  )

  const previousPeriodTransactions = useMemo(() => {
    return getPeriodTransactions(transactions, mode, previousPeriod.year, previousPeriod.month)
  }, [transactions, mode, previousPeriod])

  const selectedYearSummaries = summariesByYear[selectedYear] ?? []
  const currentYearSummaries = summariesByYear[currentYear] ?? []
  const hasValidSelectedYearSummary = isValidYearSummary(selectedYearSummaries, selectedYear)
  const hasValidCurrentYearSummary = isValidYearSummary(currentYearSummaries, currentYear)
  const canUseSummaryForSelectedPeriod =
    hasValidSelectedYearSummary && mode === 'monthly' && previousPeriod.year === selectedYear
  const summarySource: 'database' | 'fallback' = canUseSummaryForSelectedPeriod ? 'database' : 'fallback'

  const currentTotals = useMemo(
    () => {
      if (summarySource === 'database') {
        return toPeriodTotals(getSummaryMonth(selectedYearSummaries, selectedYear, selectedMonth))
      }

      return calculatePeriodTotals(currentPeriodTransactions)
    },
    [currentPeriodTransactions, mode, selectedMonth, selectedYear, selectedYearSummaries, summarySource]
  )
  const previousTotals = useMemo(
    () => {
      if (summarySource === 'database') {
        return toPeriodTotals(getSummaryMonth(selectedYearSummaries, previousPeriod.year, previousPeriod.month))
      }

      return calculatePeriodTotals(previousPeriodTransactions)
    },
    [previousPeriod, previousPeriodTransactions, selectedYearSummaries, summarySource]
  )

  const executiveCurrentTotals = useMemo(
    () => currentTotals,
    [currentTotals]
  )

  const executivePreviousTotals = useMemo(
    () => previousTotals,
    [previousTotals]
  )

  const profitVariationAmount = useMemo(
    () => executiveCurrentTotals.profit - executivePreviousTotals.profit,
    [executiveCurrentTotals.profit, executivePreviousTotals.profit]
  )

  const profitVariation = useMemo(
    () => calculateGrowthPercent(executiveCurrentTotals.profit, executivePreviousTotals.profit),
    [executiveCurrentTotals.profit, executivePreviousTotals.profit]
  )

  const revenueGrowth = useMemo(
    () => calculateGrowthPercent(currentTotals.revenue, previousTotals.revenue),
    [currentTotals.revenue, previousTotals.revenue]
  )

  const expenseGrowth = useMemo(
    () => calculateGrowthPercent(currentTotals.expense, previousTotals.expense),
    [currentTotals.expense, previousTotals.expense]
  )

  const performanceCutoffTime = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return today.getTime()
  }, [])

  const performanceOverviewTransactions = useMemo(
    () => transactions.filter((item) => item.parsedDate.getTime() <= performanceCutoffTime),
    [transactions, performanceCutoffTime]
  )

  const performanceOverviewCurrentYearSeries = useMemo(
    () =>
      hasValidCurrentYearSummary
        ? buildSummaryCurrentYearSeries(currentYearSummaries, currentYear, currentMonth)
        : buildPerformanceOverviewSeries(performanceOverviewTransactions, 'monthly', currentYear, {
            zeroFutureMonthsAfter: currentMonth,
            cutoffTime: performanceCutoffTime
          }),
    [
      currentYear,
      currentMonth,
      currentYearSummaries,
      hasValidCurrentYearSummary,
      performanceCutoffTime,
      performanceOverviewTransactions
    ]
  )

  const performanceOverviewTotalAnnualSeries = useMemo(
    () =>
      buildPerformanceOverviewSeries(performanceOverviewTransactions, 'annual', currentYear, {
        cutoffTime: performanceCutoffTime
      }),
    [performanceOverviewTransactions, currentYear, performanceCutoffTime]
  )

  const hasDataInSelection = useMemo(() => {
    if (summarySource === 'database') {
      return true
    }

    if (mode === 'annual') {
      return transactions.length > 0
    }

    return transactions.some((item) => item.year === selectedYear)
  }, [transactions, mode, selectedYear, summarySource])

  const lineSeries = useMemo(() => {
    if (summarySource === 'database') {
      return buildSummaryLineSeries(selectedYearSummaries)
    }

    if (mode === 'annual') {
      return buildLastNYearsSeries(transactions, selectedYear, 6)
    }

    return buildLast12MonthsSeries(transactions, selectedYear, selectedMonth)
  }, [mode, selectedMonth, selectedYear, selectedYearSummaries, summarySource, transactions])

  const healthSnapshot = useMemo<HealthSnapshot>(() => {
    const periodProfits = summarySource === 'database'
      ? lineSeries.slice(-3).map((item) => item.profit)
      : buildLastNPeriodProfits(transactions, mode, selectedYear, selectedMonth, 3)
    const averageProfitLast3 = periodProfits.reduce((acc, value) => acc + value, 0) / periodProfits.length

    const lastSixProfits = lineSeries.map((item) => item.profit)
    const shortMovingAverage = calculateMovingAverage(lastSixProfits, 3)
    const longMovingAverage = calculateMovingAverage(lastSixProfits, 6)

    const trend: 'subindo' | 'descendo' | 'estavel' =
      shortMovingAverage === null || longMovingAverage === null
        ? 'estavel'
        : shortMovingAverage > longMovingAverage
          ? 'subindo'
          : shortMovingAverage < longMovingAverage
            ? 'descendo'
            : 'estavel'

    const expenseGrowingFaster =
      revenueGrowth === null || expenseGrowth === null ? null : expenseGrowth > revenueGrowth

    return {
      averageProfitLast3,
      revenueGrowth,
      expenseGrowth,
      trend,
      expenseGrowingFaster
    }
  }, [transactions, mode, selectedYear, selectedMonth, lineSeries, revenueGrowth, expenseGrowth, summarySource])

  const accumulatedProfit = useMemo(() => calculateAccumulatedProfit(transactions), [transactions])

  const investmentAmount = useMemo(() => {
    const value = businessSettings?.investment_base_amount ?? null
    return value !== null && value > 0 ? value : null
  }, [businessSettings])

  const roi = useMemo(
    () => calculateRoi(accumulatedProfit, investmentAmount),
    [accumulatedProfit, investmentAmount]
  )

  const executiveMargin = useMemo(
    () => calculateMargin(executiveCurrentTotals.revenue, executiveCurrentTotals.profit),
    [executiveCurrentTotals.revenue, executiveCurrentTotals.profit]
  )

  const periodLabel = useMemo(() => {
    if (mode === 'annual') {
      return String(selectedYear)
    }

    return `${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`
  }, [mode, selectedYear, selectedMonth])

  const withPrivacyMask = (value: string): string => {
    if (isValuesVisible) {
      return value
    }

    return '••••••'
  }

  const refreshSummaries = async (): Promise<void> => {
    setIsRefreshingSummaries(true)
    setSummaryFeedback('')

    try {
      const refreshed = await financialSummaryService.refreshYear(selectedYear)
      setSummariesByYear((prev) => ({ ...prev, [selectedYear]: refreshed }))
      setSummaryFeedback('Resumo financeiro atualizado.')
      setSummaryFeedbackTone('success')
    } catch {
      setSummaryFeedback('Nao foi possivel atualizar o resumo financeiro.')
      setSummaryFeedbackTone('error')
    } finally {
      setIsRefreshingSummaries(false)
    }
  }

  const isLoading = isTransactionsLoading || isBusinessLoading || isSummaryLoading
  const hasDashboardData = summarySource === 'database' || transactions.length > 0
  const shouldShowEmptyState = !error && !hasDashboardData
  const shouldShowLoadedContent = !error && hasDashboardData

  return {
    accumulatedProfit,
    availableYears,
    businessSettingsFailed,
    performanceOverviewCurrentYearSeries,
    performanceOverviewTotalAnnualSeries,
    performanceOverviewCurrentYear: currentYear,
    currentTotals,
    error,
    executiveCurrentTotals,
    executiveMargin,
    expenseGrowth,
    hasDataInSelection,
    healthSnapshot,
    investmentAmount,
    isHelpPanelOpen,
    isLoading,
    isValuesVisible,
    lineSeries,
    mode,
    periodLabel,
    profitVariationAmount,
    profitVariation,
    revenueGrowth,
    roi,
    selectedMonth,
    selectedYear,
    shouldShowEmptyState,
    shouldShowLoadedContent,
    withPrivacyMask,
    setMode,
    setSelectedYear,
    setSelectedMonth,
    setIsValuesVisible,
    toggleHelpPanel: () => setIsHelpPanelOpen((prev) => !prev),
    closeHelpPanel: () => setIsHelpPanelOpen(false),
    formatCurrency,
    formatPercent,
    isRefreshingSummaries,
    refreshSummaries,
    summaryFeedback,
    summaryFeedbackTone,
    summarySource
  }
}
