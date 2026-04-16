import type { CategoryItem } from '../services/finance.service'
import type { Transaction } from './transaction.types'

export interface BackupFile {
  version: 1
  exportedAt: string
  source: 'chatfinacial-pwa'
  categories: CategoryItem[]
  transactions: Transaction[]
}
