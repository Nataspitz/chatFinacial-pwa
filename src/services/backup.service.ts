import type { BackupBusinessSettings, BackupFile } from '../types/backup.types'
import { DEFAULT_TRANSACTION_SETTINGS, type TransactionSettings } from '../types/transaction-settings.types'
import type { PaymentMethod, Transaction, TransactionType } from '../types/transaction.types'
import { businessService } from './business.service'
import { financeService, type CategoryItem } from './finance.service'
import { transactionSettingsService } from './transaction-settings.service'

const BACKUP_SOURCE = 'chatfinacial-pwa'
const BACKUP_VERSION = 1

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

const normalizeDateValue = (value: unknown): string | null =>
  typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/) ? value.slice(0, 10) : null

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeOptionalInteger = (value: unknown): number | null => {
  const parsed = normalizeOptionalNumber(value)
  if (parsed === null) {
    return null
  }

  const truncated = Math.floor(parsed)
  return Number.isFinite(truncated) ? truncated : null
}

const getDefaultConfirmedByDate = (dateValue: string): boolean => dateValue <= getTodayDate()

const isBackupFile = (value: unknown): value is BackupFile => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BackupFile>
  return (
    candidate.version === BACKUP_VERSION &&
    candidate.source === BACKUP_SOURCE &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.transactions)
  )
}

const sanitizeBackupCategory = (value: unknown): CategoryItem | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<CategoryItem>
  if (!isValidTransactionType(candidate.type) || typeof candidate.name !== 'string') {
    return null
  }

  const normalizedName = normalizeCategoryValue(candidate.name)
  if (!normalizedName) {
    return null
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : crypto.randomUUID(),
    type: candidate.type,
    name: normalizedName
  }
}

const sanitizeBackupTransaction = (value: unknown): Transaction | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<Transaction>
  if (!isValidTransactionType(candidate.type) || typeof candidate.category !== 'string') {
    return null
  }

  const amount = normalizeOptionalNumber(candidate.amount)
  const normalizedDate = normalizeDateValue(candidate.date)
  if (!amount || amount <= 0 || !normalizedDate) {
    return null
  }

  const normalizedCategory = normalizeCategoryValue(candidate.category)
  if (!normalizedCategory) {
    return null
  }

  const paymentMethod = isValidPaymentMethod(candidate.paymentMethod) ? candidate.paymentMethod : 'pix'
  const isCredit = paymentMethod === 'credito'
  const normalizedInstallmentCount = normalizeOptionalInteger(candidate.installmentCount)
  const normalizedInstallmentNumber = normalizeOptionalInteger(candidate.installmentNumber)
  const installmentCount = isCredit ? Math.max(1, Math.min(normalizedInstallmentCount ?? 1, 48)) : 1
  const installmentNumber = isCredit ? Math.max(1, Math.min(normalizedInstallmentNumber ?? 1, installmentCount)) : 1
  const isInstallment = isCredit && installmentCount > 1
  const totalAmountCandidate = normalizeOptionalNumber(candidate.totalAmount)
  const totalAmount = isInstallment ? Math.max(totalAmountCandidate ?? amount * installmentCount, amount) : amount
  const isMonthlyCostCandidate = Boolean(candidate.isMonthlyCost)

  return {
    id: typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : crypto.randomUUID(),
    type: candidate.type,
    category: normalizedCategory,
    amount,
    description: typeof candidate.description === 'string' ? candidate.description.trim() : '',
    date: normalizedDate,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    isConfirmed: typeof candidate.isConfirmed === 'boolean' ? candidate.isConfirmed : getDefaultConfirmedByDate(normalizedDate),
    isMonthlyCost: candidate.type === 'saida' ? isMonthlyCostCandidate && !isInstallment : false,
    paymentMethod,
    installmentGroupId:
      isInstallment && typeof candidate.installmentGroupId === 'string' && candidate.installmentGroupId.length > 0
        ? candidate.installmentGroupId
        : null,
    installmentNumber,
    installmentCount,
    totalAmount,
    isInstallment
  }
}

const sanitizeBackupTransactionSettings = (value: unknown): TransactionSettings | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<TransactionSettings>
  return {
    defaultPaymentMethodEntrada: isValidPaymentMethod(candidate.defaultPaymentMethodEntrada)
      ? candidate.defaultPaymentMethodEntrada
      : DEFAULT_TRANSACTION_SETTINGS.defaultPaymentMethodEntrada,
    defaultPaymentMethodSaida: isValidPaymentMethod(candidate.defaultPaymentMethodSaida)
      ? candidate.defaultPaymentMethodSaida
      : DEFAULT_TRANSACTION_SETTINGS.defaultPaymentMethodSaida,
    defaultConfirmedEntrada:
      typeof candidate.defaultConfirmedEntrada === 'boolean'
        ? candidate.defaultConfirmedEntrada
        : DEFAULT_TRANSACTION_SETTINGS.defaultConfirmedEntrada,
    defaultConfirmedSaida:
      typeof candidate.defaultConfirmedSaida === 'boolean'
        ? candidate.defaultConfirmedSaida
        : DEFAULT_TRANSACTION_SETTINGS.defaultConfirmedSaida,
    defaultMonthlyCostSaida:
      typeof candidate.defaultMonthlyCostSaida === 'boolean'
        ? candidate.defaultMonthlyCostSaida
        : DEFAULT_TRANSACTION_SETTINGS.defaultMonthlyCostSaida,
    enforceConsistency:
      typeof candidate.enforceConsistency === 'boolean'
        ? candidate.enforceConsistency
        : DEFAULT_TRANSACTION_SETTINGS.enforceConsistency,
    allowCreditWithoutInstallments:
      typeof candidate.allowCreditWithoutInstallments === 'boolean'
        ? candidate.allowCreditWithoutInstallments
        : DEFAULT_TRANSACTION_SETTINGS.allowCreditWithoutInstallments
  }
}

const sanitizeBackupBusinessSettings = (value: unknown): BackupBusinessSettings | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<BackupBusinessSettings>
  const baseDate = normalizeDateValue(candidate.accountBalanceBaseDate) ?? getTodayDate()

  return {
    investmentBaseAmount: normalizeOptionalNumber(candidate.investmentBaseAmount),
    noInitialInvestment: Boolean(candidate.noInitialInvestment),
    accountBalanceBaseAmount: normalizeOptionalNumber(candidate.accountBalanceBaseAmount) ?? 0,
    accountBalanceBaseDate: baseDate,
    accountBalanceLockedAt:
      typeof candidate.accountBalanceLockedAt === 'string' && candidate.accountBalanceLockedAt.length > 0
        ? candidate.accountBalanceLockedAt
        : null
  }
}

export const backupService = {
  buildBackup(input: {
    categories: CategoryItem[]
    transactions: Transaction[]
    transactionSettings?: TransactionSettings | null
    businessSettings?: BackupBusinessSettings | null
  }): BackupFile {
    const payload: BackupFile = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      source: BACKUP_SOURCE,
      categories: input.categories,
      transactions: input.transactions
    }

    if (input.transactionSettings) {
      payload.transactionSettings = input.transactionSettings
    }

    if (input.businessSettings) {
      payload.businessSettings = input.businessSettings
    }

    return payload
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

  async restoreBackup(rawContent: string): Promise<{
    importedTransactions: number
    restoredTransactionSettings: boolean
    restoredBusinessSettings: boolean
    warnings: string[]
  }> {
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawContent) as unknown
    } catch {
      throw new Error('Arquivo de backup invalido.')
    }

    const parsed = parsedJson as unknown
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

    const warnings: string[] = []
    let restoredTransactionSettings = false
    let restoredBusinessSettings = false

    if (parsed.transactionSettings !== undefined) {
      const settings = sanitizeBackupTransactionSettings(parsed.transactionSettings)
      if (settings) {
        try {
          await transactionSettingsService.saveSettings(settings)
          restoredTransactionSettings = true
        } catch {
          warnings.push('Nao foi possivel restaurar as configuracoes de transacoes.')
        }
      }
    }

    if (parsed.businessSettings !== undefined) {
      const settings = sanitizeBackupBusinessSettings(parsed.businessSettings)
      if (settings) {
        try {
          await businessService.updateBusinessSettings({
            investment_base_amount: settings.investmentBaseAmount,
            no_initial_investment: settings.noInitialInvestment,
            account_balance_base_amount: settings.accountBalanceBaseAmount,
            account_balance_base_date: settings.accountBalanceBaseDate,
            account_balance_locked_at: settings.accountBalanceLockedAt
          })
          restoredBusinessSettings = true
        } catch {
          warnings.push('Nao foi possivel restaurar as configuracoes de saldo inicial.')
        }
      }
    }

    return {
      importedTransactions: newTransactions.length,
      restoredTransactionSettings,
      restoredBusinessSettings,
      warnings
    }
  }
}
