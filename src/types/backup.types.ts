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

export interface BackupFile {
  version: 1
  exportedAt: string
  source: 'chatfinacial-pwa'
  categories: CategoryItem[]
  transactions: Transaction[]
  transactionSettings?: TransactionSettings
  businessSettings?: BackupBusinessSettings
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
}
