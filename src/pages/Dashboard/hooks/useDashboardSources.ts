import { useCallback, useEffect, useState } from 'react'
import { businessService, type BusinessSettings } from '../../../services/business.service'
import { financialSummaryService } from '../../../services/financial-summary.service'
import { financeService } from '../../../services/finance.service'
import type { FinancialMonthlySummary } from '../../../types/financial-summary.types'
import { parseTransactionDate } from '../dashboard-calculations'
import type { NormalizedTransaction } from '../types'

const normalizeDashboardTransactions = (transactions: Awaited<ReturnType<typeof financeService.getTransactions>>): NormalizedTransaction[] =>
  transactions
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

    if (transactionsResult.status === 'fulfilled') {
      setTransactions(normalizeDashboardTransactions(transactionsResult.value))
      setError('')
    } else {
      setError('Nao foi possivel carregar os dados da dashboard.')
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
      setSummariesByYear((prev) => ({ ...prev, [currentYear]: summaryResult.value }))
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
      setSummaryFeedback('Nao foi possivel atualizar o resumo financeiro.')
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
