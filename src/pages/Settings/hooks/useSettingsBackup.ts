import { useRef, useState, type ChangeEvent } from 'react'
import { backupService } from '../../../services/backup.service'
import { businessService } from '../../../services/business.service'
import { financeService, type CategoryItem } from '../../../services/finance.service'
import { goalsService } from '../../../services/goals.service'
import { transactionSettingsService } from '../../../services/transaction-settings.service'
import type { BackupBusinessSettings } from '../../../types/backup.types'
import type { Goal } from '../../../types/goal.types'
import { DEFAULT_TRANSACTION_SETTINGS } from '../../../types/transaction-settings.types'
import type { Transaction } from '../../../types/transaction.types'

interface BackupSnapshot {
  transactions: Transaction[]
  categories: CategoryItem[]
  goals: Goal[]
}

interface LoadBackupDataOptions {
  clearFeedback?: boolean
}

export const useSettingsBackup = () => {
  const backupInputRef = useRef<HTMLInputElement | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [backupFeedback, setBackupFeedback] = useState('')

  const loadBackupData = async (options: LoadBackupDataOptions = {}): Promise<BackupSnapshot> => {
    const { clearFeedback = true } = options
    setIsLoadingData(true)
    if (clearFeedback) setBackupFeedback('')

    try {
      const [loadedTransactions, entradaCategories, saidaCategories, loadedGoals] = await Promise.all([
        financeService.getTransactions(),
        financeService.getCategoryItems('entrada'),
        financeService.getCategoryItems('saida'),
        goalsService.getGoals()
      ])
      return {
        transactions: loadedTransactions,
        categories: [...entradaCategories, ...saidaCategories],
        goals: loadedGoals
      }
    } catch {
      setBackupFeedback('Não foi possível carregar os dados para backup.')
      throw new Error('Não foi possível carregar os dados para backup.')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleExportBackup = async (): Promise<void> => {
    setBackupFeedback('')
    try {
      const [snapshot, userTransactionSettings, userBusinessSettings] = await Promise.all([
        loadBackupData({ clearFeedback: false }),
        transactionSettingsService.getSettings().catch(() => DEFAULT_TRANSACTION_SETTINGS),
        businessService.getBusinessSettings().catch(() => null)
      ])

      const businessSettings: BackupBusinessSettings | undefined = userBusinessSettings
        ? {
            investmentBaseAmount: userBusinessSettings.investment_base_amount,
            noInitialInvestment: userBusinessSettings.no_initial_investment,
            accountBalanceBaseAmount: userBusinessSettings.account_balance_base_amount,
            accountBalanceBaseDate: userBusinessSettings.account_balance_base_date,
            accountBalanceLockedAt: userBusinessSettings.account_balance_locked_at
          }
        : undefined

      const payload = backupService.buildBackup({
        categories: snapshot.categories,
        transactions: snapshot.transactions,
        goals: snapshot.goals,
        transactionSettings: userTransactionSettings,
        businessSettings
      })

      const folderName = await backupService.downloadBackupFolder(payload)
      const usedFolderApi = typeof window.showDirectoryPicker === 'function'
      setBackupFeedback(
        usedFolderApi
          ? `Backup salvo na pasta ${folderName}.`
          : `Seu navegador não permitiu criar uma pasta diretamente. Os arquivos do backup foram baixados separadamente com o prefixo ${folderName}.`
      )
    } catch {
      setBackupFeedback('Não foi possível baixar o backup.')
    }
  }

  const handleImportBackupClick = (): void => {
    setBackupFeedback('')
    backupInputRef.current?.click()
  }

  const handleImportBackupFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    setIsImportingBackup(true)
    setBackupFeedback('')
    try {
      const result = await backupService.restoreBackupFolder(files)
      const feedbackParts = [`Backup restaurado. ${result.importedTransactions} transações novas foram importadas.`]
      if ((result.restoredGoals ?? 0) > 0) feedbackParts.push(`${result.restoredGoals} metas foram restauradas.`)
      if (result.restoredTransactionSettings) feedbackParts.push('Configurações de transações foram restauradas.')
      if (result.restoredBusinessSettings) feedbackParts.push('Configurações de saldo inicial foram restauradas.')
      if ((result.warnings ?? []).length > 0) feedbackParts.push(`Avisos: ${result.warnings?.join(' ')}`)
      setBackupFeedback(feedbackParts.join(' '))
      await loadBackupData({ clearFeedback: false })
    } catch (error) {
      setBackupFeedback(error instanceof Error ? error.message : 'Não foi possível restaurar o backup.')
    } finally {
      setIsImportingBackup(false)
    }
  }

  return {
    backupInputRef,
    isLoadingData,
    isImportingBackup,
    backupFeedback,
    loadBackupData,
    handleExportBackup,
    handleImportBackupClick,
    handleImportBackupFile
  }
}
