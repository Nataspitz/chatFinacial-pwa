import { useCallback, useEffect, useRef, useState } from 'react'
import { businessService } from '../../../services/business.service'
import { financialSummaryService } from '../../../services/financial-summary.service'
import { financeService } from '../../../services/finance.service'
import { goalsService } from '../../../services/goals.service'
import type { FinancialMonthlySummary } from '../../../types/financial-summary.types'
import type { Goal, GoalStatus } from '../../../types/goal.types'
import type { Transaction } from '../../../types/transaction.types'
import { shouldAffectFinancialReports } from '../../../utils/transaction-reports'

interface MonthlyAverages {
  entries: number
  outcomes: number
  result: number
}

interface GoalFormPayload {
  title: string
  targetAmount: number
}

export interface FinancialSnapshot {
  accountBalance: number
  averageMonthlyEntries: number
  averageMonthlyOutcomes: number
  averageMonthlyResult: number
}

const SYSTEM_GOAL_CREDIT_KEY = 'credit-card-open-invoice'

const emptySnapshot: FinancialSnapshot = {
  accountBalance: 0,
  averageMonthlyEntries: 0,
  averageMonthlyOutcomes: 0,
  averageMonthlyResult: 0
}

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeDate = (value: string): string | null => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null

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

const getCurrentMonthSummaryBalance = (summaries: FinancialMonthlySummary[]): number | null => {
  const now = new Date()
  const monthRef = toMonthRef(now.getFullYear(), now.getMonth() + 1)
  const summary = summaries.find((item) => item.monthRef === monthRef)
  return summary ? summary.accountBalance : null
}

const calcAverageMonthlyAveragesFromSummaries = (summaries: FinancialMonthlySummary[]): MonthlyAverages => {
  const currentMonth = new Date().getMonth() + 1
  const elapsedSummaries = summaries.slice(0, currentMonth)
  if (elapsedSummaries.length === 0) {
    return { entries: 0, outcomes: 0, result: 0 }
  }

  const entries = elapsedSummaries.reduce((acc, item) => acc + item.totalEntries, 0) / elapsedSummaries.length
  const outcomes = elapsedSummaries.reduce((acc, item) => acc + item.totalOutcomes, 0) / elapsedSummaries.length

  return {
    entries,
    outcomes,
    result: entries - outcomes
  }
}

const calcAccountBalance = (transactions: Transaction[], baseAmount: number, baseDate: string): number => {
  const today = getTodayDate()

  return transactions.reduce((acc, item) => {
    if (!item.isConfirmed) {
      return acc
    }

    const date = normalizeDate(item.date)
    if (!date || date < baseDate || date > today) {
      return acc
    }

    return item.type === 'entrada' ? acc + item.amount : acc - item.amount
  }, baseAmount)
}

const calcOpenCreditInvoiceGoal = (transactions: Transaction[]): number => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
  const currentMonthStart = `${currentYear}-${currentMonth}-01`

  return transactions
    .filter((item) => {
      if (item.type !== 'saida') return false
      if (item.paymentMethod !== 'credito') return false
      if (item.isMonthlyCost) return false
      if (item.isConfirmed) return false

      const normalizedDate = normalizeDate(item.date)
      if (!normalizedDate) return false

      return normalizedDate >= currentMonthStart
    })
    .reduce((acc, item) => acc + item.amount, 0)
}

const getMonthKey = (date: string): string | null => {
  const normalized = normalizeDate(date)
  return normalized ? normalized.slice(0, 7) : null
}

const getMonthRangeCountInclusive = (fromDate: string, toDate: string): number => {
  const from = normalizeDate(fromDate)
  const to = normalizeDate(toDate)

  if (!from || !to) {
    return 1
  }

  const fromYear = Number(from.slice(0, 4))
  const fromMonth = Number(from.slice(5, 7))
  const toYear = Number(to.slice(0, 4))
  const toMonth = Number(to.slice(5, 7))

  if (!Number.isFinite(fromYear) || !Number.isFinite(fromMonth) || !Number.isFinite(toYear) || !Number.isFinite(toMonth)) {
    return 1
  }

  const diff = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1
  return Math.max(1, diff)
}

const calcAverageMonthlyAverages = (transactions: Transaction[], baseAmountDate: string): MonthlyAverages => {
  const today = getTodayDate()
  const monthTotals = new Map<string, { entries: number; outcomes: number }>()

  transactions.forEach((item) => {
    if (!item.isConfirmed) {
      return
    }

    const date = normalizeDate(item.date)
    if (!date || date < baseAmountDate || date > today) {
      return
    }

    const monthKey = getMonthKey(date)
    if (!monthKey) {
      return
    }

    const totals = monthTotals.get(monthKey) ?? { entries: 0, outcomes: 0 }
    if (item.type === 'entrada') {
      totals.entries += item.amount
    } else {
      totals.outcomes += item.amount
    }
    monthTotals.set(monthKey, totals)
  })

  const monthsCount = getMonthRangeCountInclusive(baseAmountDate, today)
  const summed = Array.from(monthTotals.values()).reduce(
    (acc, value) => ({
      entries: acc.entries + value.entries,
      outcomes: acc.outcomes + value.outcomes
    }),
    { entries: 0, outcomes: 0 }
  )

  const entries = summed.entries / monthsCount
  const outcomes = summed.outcomes / monthsCount
  return {
    entries,
    outcomes,
    result: entries - outcomes
  }
}

export const useGoalsData = () => {
  const isRefreshingRef = useRef(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>(emptySnapshot)

  const loadGoals = useCallback(async (): Promise<void> => {
    const loadedGoals = await goalsService.getGoals()
    setGoals(loadedGoals)
  }, [])

  const loadFinancialSnapshot = useCallback(async (): Promise<Transaction[]> => {
    const currentYear = new Date().getFullYear()
    const [transactionsResult, businessResult, summariesResult] = await Promise.allSettled([
      financeService.getTransactions(),
      businessService.getBusinessSettings(),
      financialSummaryService.listYear(currentYear)
    ])

    if (transactionsResult.status !== 'fulfilled') {
      throw new Error('Não foi possível carregar as metas.')
    }

    const loadedTransactions = transactionsResult.value.filter(shouldAffectFinancialReports)

    if (summariesResult.status === 'fulfilled' && isValidYearSummary(summariesResult.value, currentYear)) {
      const summaryBalance = getCurrentMonthSummaryBalance(summariesResult.value)
      if (summaryBalance !== null) {
        const averages = calcAverageMonthlyAveragesFromSummaries(summariesResult.value)
        setSnapshot({
          accountBalance: summaryBalance,
          averageMonthlyEntries: averages.entries,
          averageMonthlyOutcomes: averages.outcomes,
          averageMonthlyResult: averages.result
        })
        return loadedTransactions
      }
    }

    if (businessResult.status === 'fulfilled') {
      const settings = businessResult.value
      const balanceBaseDate = settings.account_balance_base_date
      const averages = calcAverageMonthlyAverages(loadedTransactions, balanceBaseDate)
      setSnapshot({
        accountBalance: calcAccountBalance(loadedTransactions, settings.account_balance_base_amount, balanceBaseDate),
        averageMonthlyEntries: averages.entries,
        averageMonthlyOutcomes: averages.outcomes,
        averageMonthlyResult: averages.result
      })
    } else {
      const fallbackBaseDate = normalizeDate(
        [...loadedTransactions]
          .map((item) => normalizeDate(item.date))
          .filter((item): item is string => Boolean(item))
          .sort()[0] ?? getTodayDate()
      ) ?? getTodayDate()

      const averages = calcAverageMonthlyAverages(loadedTransactions, fallbackBaseDate)
      setSnapshot({
        accountBalance: calcAccountBalance(loadedTransactions, 0, fallbackBaseDate),
        averageMonthlyEntries: averages.entries,
        averageMonthlyOutcomes: averages.outcomes,
        averageMonthlyResult: averages.result
      })
    }

    return loadedTransactions
  }, [])

  const syncSystemGoalFromTransactions = useCallback(async (transactions: Transaction[]): Promise<void> => {
    await goalsService.syncSystemGoal({
      systemKey: SYSTEM_GOAL_CREDIT_KEY,
      title: 'Cartão de crédito (fatura em aberto)',
      targetAmount: calcOpenCreditInvoiceGoal(transactions)
    })
  }, [])

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError('')

    try {
      const loadedTransactions = await loadFinancialSnapshot()
      await syncSystemGoalFromTransactions(loadedTransactions)
      await loadGoals()
    } catch {
      setError('Não foi possível sincronizar as metas com o banco.')
    } finally {
      setIsLoading(false)
    }
  }, [loadFinancialSnapshot, loadGoals, syncSystemGoalFromTransactions])

  const refreshDataSilently = useCallback(async (): Promise<void> => {
    if (isRefreshingRef.current) {
      return
    }

    isRefreshingRef.current = true
    try {
      const loadedTransactions = await loadFinancialSnapshot()
      await syncSystemGoalFromTransactions(loadedTransactions)
      await loadGoals()
    } catch {
      // Evita exibir erro de atualização automática em background.
    } finally {
      isRefreshingRef.current = false
    }
  }, [loadFinancialSnapshot, loadGoals, syncSystemGoalFromTransactions])

  const saveGoal = useCallback(async (goal: GoalFormPayload, editingGoalId: string | null): Promise<void> => {
    if (editingGoalId) {
      await goalsService.updateGoal(editingGoalId, goal)
    } else {
      await goalsService.createGoal(goal)
    }

    await loadGoals()
  }, [loadGoals])

  const updateGoalStatus = useCallback(async (goal: Goal, status: GoalStatus): Promise<void> => {
    await goalsService.updateGoalStatus(goal.id, status)
    await loadGoals()
  }, [loadGoals])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshDataSilently()
    }, 30000)

    const handleFocusRefresh = (): void => {
      void refreshDataSilently()
    }

    window.addEventListener('focus', handleFocusRefresh)
    document.addEventListener('visibilitychange', handleFocusRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocusRefresh)
      document.removeEventListener('visibilitychange', handleFocusRefresh)
    }
  }, [refreshDataSilently])

  return {
    goals,
    isLoading,
    error,
    snapshot,
    loadGoals,
    saveGoal,
    updateGoalStatus
  }
}
