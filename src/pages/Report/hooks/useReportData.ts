import { useEffect, useState } from 'react'
import { financeService, type CategoryItem } from '../../../services/finance.service'
import { financialAuditService } from '../../../services/financial-audit.service'
import { setFinancialAuditLockedPeriods } from '../../../services/financial-audit-lock'
import { transactionSettingsService } from '../../../services/transaction-settings.service'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  type TransactionSettings
} from '../../../types/transaction-settings.types'
import type { Transaction, TransactionType } from '../../../types/transaction.types'
import { ensureGeneralCategoryOption } from '../../../utils/transaction-categories'

export const useReportData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<Record<TransactionType, CategoryItem[]>>({
    entrada: [],
    saida: []
  })
  const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>(DEFAULT_TRANSACTION_SETTINGS)
  const [toastMessage, setToastMessage] = useState('')

  const loadTransactions = async (): Promise<void> => {
    try {
      const data = await financeService.getTransactions()
      setTransactions(data)
      setError('')
    } catch {
      setError('Não foi possível carregar as transações.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async (): Promise<void> => {
    try {
      const [entradaCategories, saidaCategories] = await Promise.all([
        financeService.getCategoryItems('entrada'),
        financeService.getCategoryItems('saida')
      ])

      setCategoryOptions({
        entrada: ensureGeneralCategoryOption(entradaCategories, 'entrada'),
        saida: ensureGeneralCategoryOption(saidaCategories, 'saida')
      })
    } catch {
      setError('Não foi possível carregar as categorias.')
    }
  }

  const loadTransactionSettings = async (): Promise<void> => {
    try {
      const settings = await transactionSettingsService.getSettings()
      setTransactionSettings(settings)
    } catch {
      setTransactionSettings(DEFAULT_TRANSACTION_SETTINGS)
    }
  }

  const loadAuditLocks = async (): Promise<void> => {
    try {
      const periods = await financialAuditService.getConfirmedLockedPeriods()
      setFinancialAuditLockedPeriods(periods)
    } catch {
      setFinancialAuditLockedPeriods([])
    }
  }

  useEffect(() => {
    void (async () => {
      await Promise.allSettled([loadTransactions(), loadCategories(), loadTransactionSettings(), loadAuditLocks()])
      setIsLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!toastMessage) return

    const timeout = window.setTimeout(() => {
      setToastMessage('')
    }, 2800)

    return () => window.clearTimeout(timeout)
  }, [toastMessage])

  return {
    transactions,
    setTransactions,
    isLoading,
    error,
    setError,
    categoryOptions,
    transactionSettings,
    toastMessage,
    setToastMessage,
    loadTransactions,
    loadCategories,
    loadAuditLocks
  }
}
