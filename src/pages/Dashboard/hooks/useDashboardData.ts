import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { businessService, type BusinessSettings } from '../../../services/business.service'
import { financeService } from '../../../services/finance.service'
import {
  buildAnnualCandles,
  buildLast12MonthsSeries,
  buildLastNPeriodProfits,
  buildMonthlyCandles,
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
import type { DashboardViewMode, HealthSnapshot, NormalizedTransaction } from '../types'

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

interface UseDashboardDataResult {
  accumulatedProfit: number
  availableYears: number[]
  businessSettings: BusinessSettings | null
  businessSettingsFailed: boolean
  candleSeries: ReturnType<typeof buildMonthlyCandles> | ReturnType<typeof buildAnnualCandles>
  currentTotals: ReturnType<typeof calculatePeriodTotals>
  error: string
  executiveCurrentTotals: ReturnType<typeof calculatePeriodTotals>
  executiveMargin: number | null
  expenseGrowth: number | null
  hasDataInSelection: boolean
  healthSnapshot: HealthSnapshot
  investmentAmount: number | null
  isCompanySettingsModalOpen: boolean
  isHelpPanelOpen: boolean
  isLoading: boolean
  isValuesVisible: boolean
  lineSeries: ReturnType<typeof buildLast12MonthsSeries>
  mode: DashboardViewMode
  periodLabel: string
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
  openCompanySettingsModal: () => void
  closeCompanySettingsModal: () => void
  toggleHelpPanel: () => void
  closeHelpPanel: () => void
  handleBusinessSettingsSaved: (settings: BusinessSettings) => void
  formatCurrency: (value: number) => string
  formatPercent: (value: number | null) => string
}

export const useDashboardData = (): UseDashboardDataResult => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [mode, setMode] = useState<DashboardViewMode>('monthly')
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([])
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null)
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true)
  const [isBusinessLoading, setIsBusinessLoading] = useState(true)
  const [error, setError] = useState('')
  const [businessSettingsFailed, setBusinessSettingsFailed] = useState(false)
  const [isCompanySettingsModalOpen, setIsCompanySettingsModalOpen] = useState(false)
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false)
  const [isValuesVisible, setIsValuesVisible] = useState(true)

  useEffect(() => {
    void (async () => {
      const [transactionsResult, businessResult] = await Promise.allSettled([
        financeService.getTransactions(),
        businessService.getBusinessSettings()
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

      setIsTransactionsLoading(false)
      setIsBusinessLoading(false)
    })()
  }, [])

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

  const currentTotals = useMemo(
    () => calculatePeriodTotals(currentPeriodTransactions),
    [currentPeriodTransactions]
  )
  const previousTotals = useMemo(
    () => calculatePeriodTotals(previousPeriodTransactions),
    [previousPeriodTransactions]
  )

  const executiveProfitCutoff = useMemo(() => {
    const cutoff = new Date()
    cutoff.setHours(23, 59, 59, 999)
    return cutoff.getTime()
  }, [])

  const currentExecutiveTransactions = useMemo(
    () => currentPeriodTransactions.filter((item) => item.parsedDate.getTime() <= executiveProfitCutoff),
    [currentPeriodTransactions, executiveProfitCutoff]
  )

  const previousExecutiveTransactions = useMemo(
    () => previousPeriodTransactions.filter((item) => item.parsedDate.getTime() <= executiveProfitCutoff),
    [previousPeriodTransactions, executiveProfitCutoff]
  )

  const executiveCurrentTotals = useMemo(
    () => calculatePeriodTotals(currentExecutiveTransactions),
    [currentExecutiveTransactions]
  )

  const executivePreviousTotals = useMemo(
    () => calculatePeriodTotals(previousExecutiveTransactions),
    [previousExecutiveTransactions]
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

  const candleSeries = useMemo(() => {
    if (mode === 'annual') {
      return buildAnnualCandles(transactions, selectedYear)
    }

    return buildMonthlyCandles(transactions, selectedYear, selectedMonth)
  }, [transactions, mode, selectedYear, selectedMonth])

  const hasDataInSelection = useMemo(() => {
    if (mode === 'annual') {
      return transactions.some((item) => item.year === selectedYear)
    }

    return transactions.some((item) => item.year === selectedYear && item.month === selectedMonth)
  }, [transactions, mode, selectedYear, selectedMonth])

  const lineSeries = useMemo(() => {
    const endMonth = mode === 'annual' ? 12 : selectedMonth
    return buildLast12MonthsSeries(transactions, selectedYear, endMonth)
  }, [transactions, mode, selectedYear, selectedMonth])

  const healthSnapshot = useMemo<HealthSnapshot>(() => {
    const periodProfits = buildLastNPeriodProfits(transactions, mode, selectedYear, selectedMonth, 3)
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
  }, [transactions, mode, selectedYear, selectedMonth, lineSeries, revenueGrowth, expenseGrowth])

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
    () => calculateMargin(currentTotals.revenue, executiveCurrentTotals.profit),
    [currentTotals.revenue, executiveCurrentTotals.profit]
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

  const isLoading = isTransactionsLoading || isBusinessLoading
  const shouldShowEmptyState = !error && transactions.length === 0
  const shouldShowLoadedContent = !error && transactions.length > 0

  return {
    accumulatedProfit,
    availableYears,
    businessSettings,
    businessSettingsFailed,
    candleSeries,
    currentTotals,
    error,
    executiveCurrentTotals,
    executiveMargin,
    expenseGrowth,
    hasDataInSelection,
    healthSnapshot,
    investmentAmount,
    isCompanySettingsModalOpen,
    isHelpPanelOpen,
    isLoading,
    isValuesVisible,
    lineSeries,
    mode,
    periodLabel,
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
    openCompanySettingsModal: () => setIsCompanySettingsModalOpen(true),
    closeCompanySettingsModal: () => setIsCompanySettingsModalOpen(false),
    toggleHelpPanel: () => setIsHelpPanelOpen((prev) => !prev),
    closeHelpPanel: () => setIsHelpPanelOpen(false),
    handleBusinessSettingsSaved: (settings: BusinessSettings) => {
      setBusinessSettings(settings)
      setBusinessSettingsFailed(false)
    },
    formatCurrency,
    formatPercent
  }
}
