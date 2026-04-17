import type { CategoryItem } from '../services/finance.service'
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
