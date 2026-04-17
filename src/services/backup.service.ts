import type { BackupFile } from '../types/backup.types'
import type { PaymentMethod, Transaction, TransactionType } from '../types/transaction.types'
import { financeService, type CategoryItem } from './finance.service'

const BACKUP_SOURCE = 'chatfinacial-pwa'

const normalizeCategoryValue = (value: string): string => value.trim().replace(/\s+/g, ' ')

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isValidTransactionType = (value: unknown): value is TransactionType => value === 'entrada' || value === 'saida'

const isValidPaymentMethod = (value: unknown): value is PaymentMethod =>
  value === 'credito' || value === 'debito' || value === 'pix' || value === 'dinheiro'

const isBackupFile = (value: unknown): value is BackupFile => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BackupFile>
  return candidate.version === 1 && candidate.source === BACKUP_SOURCE && Array.isArray(candidate.categories) && Array.isArray(candidate.transactions)
}

const sanitizeBackupCategory = (value: unknown): CategoryItem | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<CategoryItem>
  if (typeof candidate.id !== 'string' || !isValidTransactionType(candidate.type) || typeof candidate.name !== 'string') {
    return null
  }

  return {
    id: candidate.id,
    type: candidate.type,
    name: normalizeCategoryValue(candidate.name)
  }
}

const sanitizeBackupTransaction = (value: unknown): Transaction | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<Transaction>
  if (
    typeof candidate.id !== 'string' ||
    !isValidTransactionType(candidate.type) ||
    typeof candidate.category !== 'string' ||
    typeof candidate.amount !== 'number' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.isConfirmed !== 'boolean' ||
    typeof candidate.isMonthlyCost !== 'boolean' ||
    !isValidPaymentMethod(candidate.paymentMethod) ||
    typeof candidate.installmentNumber !== 'number' ||
    typeof candidate.installmentCount !== 'number' ||
    typeof candidate.totalAmount !== 'number' ||
    typeof candidate.isInstallment !== 'boolean'
  ) {
    return null
  }

  return {
    id: candidate.id,
    type: candidate.type,
    category: normalizeCategoryValue(candidate.category),
    amount: candidate.amount,
    description: candidate.description.trim(),
    date: candidate.date,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    isConfirmed: candidate.isConfirmed,
    isMonthlyCost: candidate.isMonthlyCost,
    paymentMethod: candidate.paymentMethod,
    installmentGroupId: typeof candidate.installmentGroupId === 'string' ? candidate.installmentGroupId : null,
    installmentNumber: candidate.installmentNumber,
    installmentCount: candidate.installmentCount,
    totalAmount: candidate.totalAmount,
    isInstallment: candidate.isInstallment
  }
}

export const backupService = {
  buildBackup(categories: CategoryItem[], transactions: Transaction[]): BackupFile {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: BACKUP_SOURCE,
      categories,
      transactions
    }
  },

  downloadBackup(payload: BackupFile): string {
    const dateLabel = getTodayDate()
    const fileName = `chatfinacial-backup-${dateLabel}.json`
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = objectUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)

    return fileName
  },

  async restoreBackup(rawContent: string): Promise<{ importedTransactions: number }> {
    const parsed = JSON.parse(rawContent) as unknown
    if (!isBackupFile(parsed)) {
      throw new Error('Arquivo de backup invalido.')
    }

    const categories = parsed.categories.map(sanitizeBackupCategory).filter((item): item is CategoryItem => item !== null)
    const backupTransactions = parsed.transactions
      .map(sanitizeBackupTransaction)
      .filter((item): item is Transaction => item !== null)

    const existingTransactions = await financeService.getTransactions()
    const existingIds = new Set(existingTransactions.map((item) => item.id))
    const newTransactions = backupTransactions.filter((item) => !existingIds.has(item.id))

    await Promise.all(categories.map((item) => financeService.saveCategory(item.name, item.type)))
    await financeService.saveTransactions(newTransactions)

    return { importedTransactions: newTransactions.length }
  }
}
