import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
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
} from '../dashboard-calculations'
import { useDashboardSources } from './useDashboardSources'
import {
  MONTH_NAMES,
  buildSummaryCurrentYearSeries,
  buildSummaryLineSeries,
  formatCurrency,
  formatPercent,
  getSummaryMonth,
  isValidYearSummary,
  toPeriodTotals
} from './dashboard-summary.utils'
import type { DashboardViewMode, HealthSnapshot } from '../types'

export const useDashboardData = () => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [mode, setMode] = useState<DashboardViewMode>('monthly')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
  const [isValuesVisible, setIsValuesVisible] = useState(true)
  const dashboardSources = useDashboardSources(currentYear, selectedYear)
  const {
    transactions,
    summariesByYear,
    businessSettings,
    isLoading,
    error,
    businessSettingsFailed,
    isRefreshingSummaries,
    refreshSummaries,
    summaryFeedback,
    summaryFeedbackTone
  } = dashboardSources

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(transactions.map((item) => item.year))).sort((a, b) => b - a)
    return years.length ? years : [currentYear]
  }, [transactions, currentYear])

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])


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

    return 'â€¢â€¢â€¢â€¢â€¢â€¢'
  }

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
