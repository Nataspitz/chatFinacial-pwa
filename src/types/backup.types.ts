import type { CategoryItem } from '../services/finance.service'
import type { Goal } from './goal.types'
import type { TransactionSettings } from './transaction-settings.types'
import type { Transaction } from './transaction.types'

export interface BackupBusinessSettings {
  investmentBaseAmount: number | null
  noInitialInvestment: boolean
  accountBalanceBaseAmount: number
  accountBalanceBaseDate: string
  accountBalanceLockedAt: string | null
}

export interface BackupFinancialAuditSettings {
  version: 1
  policy: 'previous-months-locked'
  lockedBeforeDate: string
  lockedThroughDate: string
  timezone: 'America/Sao_Paulo'
  databaseTrigger: 'trg_prevent_closed_financial_period_transaction_changes'
  exportedAt: string
}

export interface BackupFile {
  version: 1
  exportedAt: string
  source: 'chatfinacial-pwa'
  categories: CategoryItem[]
  transactions: Transaction[]
  transactionSettings?: TransactionSettings
  businessSettings?: BackupBusinessSettings
  financialAudit?: BackupFinancialAuditSettings
}

export interface BackupFolderMetadata {
  version: 2
  exportedAt: string
  source: 'chatfinacial-pwa'
  files: string[]
}

export interface BackupFolderBundle {
  metadata: BackupFolderMetadata
  categories: CategoryItem[]
  transactions: Transaction[]
  goals: Goal[]
  transactionSettings?: TransactionSettings | null
  businessSettings?: BackupBusinessSettings | null
  financialAudit?: BackupFinancialAuditSettings | null
}
