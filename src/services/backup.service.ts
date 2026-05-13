import type {
  BackupBusinessSettings,
  BackupFile,
  BackupFinancialAuditSettings,
  BackupFolderBundle,
  BackupFolderMetadata
} from '../types/backup.types'
import type { Goal } from '../types/goal.types'
import { DEFAULT_TRANSACTION_SETTINGS, type TransactionSettings } from '../types/transaction-settings.types'
import type { PaymentMethod, Transaction, TransactionType } from '../types/transaction.types'
import { businessService } from './business.service'
import { getFinancialAuditLockCutoffDate } from './financial-audit-lock'
import { financeService, type CategoryItem } from './finance.service'
import { goalsService } from './goals.service'
import { transactionSettingsService } from './transaction-settings.service'

const LEGACY_BACKUP_SOURCE = 'chatfinacial-pwa'
const LEGACY_BACKUP_VERSION = 1
const BACKUP_SOURCE = 'chatfinacial-pwa'
const BACKUP_FOLDER_VERSION = 2
const BACKUP_FOLDER_FILE_NAMES = {
  metadata: 'metadata.json',
  categories: 'categories.json',
  transactions: 'transactions.json',
  goals: 'goals.json',
  transactionSettings: 'transaction-settings.json',
  businessSettings: 'business-settings.json',
  financialAudit: 'financial-audit.json'
} as const

type BackupFolderFileName = (typeof BACKUP_FOLDER_FILE_NAMES)[keyof typeof BACKUP_FOLDER_FILE_NAMES]

const normalizeCategoryValue = (value: string): string => value.trim().replace(/\s+/g, ' ')

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getBackupFolderName = (): string => `chatfinacial-backup-${getTodayDate()}`

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

const getPreviousDate = (dateValue: string): string => {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const buildFinancialAuditSettings = (): BackupFinancialAuditSettings => {
  const lockedBeforeDate = getFinancialAuditLockCutoffDate()

  return {
    version: 1,
    policy: 'previous-months-locked',
    lockedBeforeDate,
    lockedThroughDate: getPreviousDate(lockedBeforeDate),
    timezone: 'America/Sao_Paulo',
    databaseTrigger: 'trg_prevent_closed_financial_period_transaction_changes',
    exportedAt: new Date().toISOString()
  }
}

const isLegacyBackupFile = (value: unknown): value is BackupFile => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BackupFile>
  return (
    candidate.version === LEGACY_BACKUP_VERSION &&
    candidate.source === LEGACY_BACKUP_SOURCE &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.transactions)
  )
}

const isBackupFolderMetadata = (value: unknown): value is BackupFolderMetadata => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<BackupFolderMetadata>
  return (
    candidate.version === BACKUP_FOLDER_VERSION &&
    candidate.source === BACKUP_SOURCE &&
    typeof candidate.exportedAt === 'string' &&
    Array.isArray(candidate.files)
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

const sanitizeBackupGoal = (value: unknown): Goal | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<Goal>
  const targetAmount = normalizeOptionalNumber(candidate.targetAmount)
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
  const status = candidate.status

  if (!title || targetAmount === null || targetAmount < 0) {
    return null
  }

  if (status !== 'active' && status !== 'completed' && status !== 'deleted') {
    return null
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : crypto.randomUUID(),
    title,
    targetAmount,
    status,
    isSystem: Boolean(candidate.isSystem),
    systemKey:
      typeof candidate.systemKey === 'string' && candidate.systemKey.trim().length > 0
        ? candidate.systemKey.trim()
        : null,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined
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

const sanitizeBackupFinancialAuditSettings = (value: unknown): BackupFinancialAuditSettings | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<BackupFinancialAuditSettings>
  const lockedBeforeDate = normalizeDateValue(candidate.lockedBeforeDate)
  const lockedThroughDate = normalizeDateValue(candidate.lockedThroughDate)

  if (
    candidate.version !== 1 ||
    candidate.policy !== 'previous-months-locked' ||
    !lockedBeforeDate ||
    !lockedThroughDate
  ) {
    return null
  }

  return {
    version: 1,
    policy: 'previous-months-locked',
    lockedBeforeDate,
    lockedThroughDate,
    timezone: 'America/Sao_Paulo',
    databaseTrigger: 'trg_prevent_closed_financial_period_transaction_changes',
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString()
  }
}

const downloadJsonFile = (fileName: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

const getFileNameFromPath = (path: string): string => path.split('/').pop() ?? path

const restoreStructuredBackup = async (bundle: BackupFolderBundle): Promise<{
  importedTransactions: number
  restoredGoals: number
  restoredTransactionSettings: boolean
  restoredBusinessSettings: boolean
  warnings: string[]
}> => {
  const categories = bundle.categories.map(sanitizeBackupCategory).filter((item): item is CategoryItem => item !== null)
  const backupTransactions = bundle.transactions
    .map(sanitizeBackupTransaction)
    .filter((item): item is Transaction => item !== null)
  const backupGoals = bundle.goals.map(sanitizeBackupGoal).filter((item): item is Goal => item !== null)

  const [existingTransactions, existingGoals] = await Promise.all([
    financeService.getTransactions(),
    goalsService.getGoals()
  ])

  const existingTransactionIds = new Set(existingTransactions.map((item) => item.id))
  const newTransactions = backupTransactions.filter((item) => !existingTransactionIds.has(item.id))

  const existingGoalIds = new Set(existingGoals.map((item) => item.id))
  const existingSystemGoalKeys = new Set(
    existingGoals.map((item) => item.systemKey).filter((item): item is string => Boolean(item))
  )
  const newGoals = backupGoals.filter((item) => {
    if (existingGoalIds.has(item.id)) {
      return false
    }

    if (item.isSystem && item.systemKey && existingSystemGoalKeys.has(item.systemKey)) {
      return false
    }

    return true
  })

  await Promise.all(categories.map((item) => financeService.saveCategory(item.name, item.type)))
  await financeService.saveTransactions(newTransactions)

  let restoredGoals = 0
  for (const goal of newGoals) {
    if (goal.isSystem && goal.systemKey) {
      await goalsService.syncSystemGoal({
        systemKey: goal.systemKey,
        title: goal.title,
        targetAmount: goal.targetAmount
      })
      restoredGoals += 1
      continue
    }

    const createdGoal = await goalsService.createGoal({
      title: goal.title,
      targetAmount: goal.targetAmount
    })

    if (goal.status !== 'active') {
      await goalsService.updateGoalStatus(createdGoal.id, goal.status)
    }

    restoredGoals += 1
  }

  const warnings: string[] = []
  let restoredTransactionSettings = false
  let restoredBusinessSettings = false

  if (bundle.transactionSettings) {
    const settings = sanitizeBackupTransactionSettings(bundle.transactionSettings)
    if (settings) {
      try {
        await transactionSettingsService.saveSettings(settings)
        restoredTransactionSettings = true
      } catch {
        warnings.push('Não foi possível restaurar as configurações de transações.')
      }
    }
  }

  if (bundle.businessSettings) {
    const settings = sanitizeBackupBusinessSettings(bundle.businessSettings)
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
        warnings.push('Não foi possível restaurar as configurações de saldo inicial.')
      }
    }
  }

  return {
    importedTransactions: newTransactions.length,
    restoredGoals,
    restoredTransactionSettings,
    restoredBusinessSettings,
    warnings
  }
}

const parseLegacyBackupContent = (rawContent: string): BackupFolderBundle => {
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawContent) as unknown
  } catch {
    throw new Error('Arquivo de backup inválido.')
  }

  if (!isLegacyBackupFile(parsedJson)) {
    throw new Error('Arquivo de backup inválido.')
  }

  return {
    metadata: {
      version: BACKUP_FOLDER_VERSION,
      exportedAt: parsedJson.exportedAt,
      source: BACKUP_SOURCE,
      files: [BACKUP_FOLDER_FILE_NAMES.categories, BACKUP_FOLDER_FILE_NAMES.transactions]
    },
    categories: parsedJson.categories,
    transactions: parsedJson.transactions,
    goals: [],
    transactionSettings: parsedJson.transactionSettings ?? null,
    businessSettings: parsedJson.businessSettings ?? null,
    financialAudit: parsedJson.financialAudit ?? null
  }
}

export const backupService = {
  buildBackup(input: {
    categories: CategoryItem[]
    transactions: Transaction[]
    goals: Goal[]
    transactionSettings?: TransactionSettings | null
    businessSettings?: BackupBusinessSettings | null
    financialAudit?: BackupFinancialAuditSettings | null
  }): BackupFolderBundle {
    const files: BackupFolderFileName[] = [
      BACKUP_FOLDER_FILE_NAMES.metadata,
      BACKUP_FOLDER_FILE_NAMES.categories,
      BACKUP_FOLDER_FILE_NAMES.transactions,
      BACKUP_FOLDER_FILE_NAMES.goals
    ]

    if (input.transactionSettings) {
      files.push(BACKUP_FOLDER_FILE_NAMES.transactionSettings)
    }

    if (input.businessSettings) {
      files.push(BACKUP_FOLDER_FILE_NAMES.businessSettings)
    }

    const financialAudit = sanitizeBackupFinancialAuditSettings(input.financialAudit) ?? buildFinancialAuditSettings()
    files.push(BACKUP_FOLDER_FILE_NAMES.financialAudit)

    return {
      metadata: {
        version: BACKUP_FOLDER_VERSION,
        exportedAt: new Date().toISOString(),
        source: BACKUP_SOURCE,
        files
      },
      categories: input.categories,
      transactions: input.transactions,
      goals: input.goals,
      transactionSettings: input.transactionSettings ?? null,
      businessSettings: input.businessSettings ?? null,
      financialAudit
    }
  },

  async downloadBackupFolder(payload: BackupFolderBundle): Promise<string> {
    const folderName = getBackupFolderName()

    if (window.showDirectoryPicker) {
      const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' })
      const backupDirectory = await rootHandle.getDirectoryHandle(folderName, { create: true })

      const files: Array<{ name: string; content: unknown }> = [
        { name: BACKUP_FOLDER_FILE_NAMES.metadata, content: payload.metadata },
        { name: BACKUP_FOLDER_FILE_NAMES.categories, content: payload.categories },
        { name: BACKUP_FOLDER_FILE_NAMES.transactions, content: payload.transactions },
        { name: BACKUP_FOLDER_FILE_NAMES.goals, content: payload.goals },
        { name: BACKUP_FOLDER_FILE_NAMES.financialAudit, content: payload.financialAudit ?? buildFinancialAuditSettings() }
      ]

      if (payload.transactionSettings) {
        files.push({ name: BACKUP_FOLDER_FILE_NAMES.transactionSettings, content: payload.transactionSettings })
      }

      if (payload.businessSettings) {
        files.push({ name: BACKUP_FOLDER_FILE_NAMES.businessSettings, content: payload.businessSettings })
      }

      for (const file of files) {
        const fileHandle = await backupDirectory.getFileHandle(file.name, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(JSON.stringify(file.content, null, 2))
        await writable.close()
      }

      return folderName
    }

    downloadJsonFile(`${folderName}-${BACKUP_FOLDER_FILE_NAMES.metadata}`, payload.metadata)
    downloadJsonFile(`${folderName}-${BACKUP_FOLDER_FILE_NAMES.categories}`, payload.categories)
    downloadJsonFile(`${folderName}-${BACKUP_FOLDER_FILE_NAMES.transactions}`, payload.transactions)
    downloadJsonFile(`${folderName}-${BACKUP_FOLDER_FILE_NAMES.goals}`, payload.goals)
    downloadJsonFile(
      `${folderName}-${BACKUP_FOLDER_FILE_NAMES.financialAudit}`,
      payload.financialAudit ?? buildFinancialAuditSettings()
    )

    if (payload.transactionSettings) {
      downloadJsonFile(`${folderName}-${BACKUP_FOLDER_FILE_NAMES.transactionSettings}`, payload.transactionSettings)
    }

    if (payload.businessSettings) {
      downloadJsonFile(`${folderName}-${BACKUP_FOLDER_FILE_NAMES.businessSettings}`, payload.businessSettings)
    }

    return folderName
  },

  async restoreBackup(rawContent: string): Promise<{
    importedTransactions: number
    restoredGoals: number
    restoredTransactionSettings: boolean
    restoredBusinessSettings: boolean
    warnings: string[]
  }> {
    const bundle = parseLegacyBackupContent(rawContent)
    return restoreStructuredBackup(bundle)
  },

  async restoreBackupFolder(files: File[]): Promise<{
    importedTransactions: number
    restoredGoals: number
    restoredTransactionSettings: boolean
    restoredBusinessSettings: boolean
    warnings: string[]
  }> {
    if (files.length === 0) {
      throw new Error('Nenhum arquivo de backup foi enviado.')
    }

    const fileMap = new Map<string, File>()
    files.forEach((file) => {
      const pathKey = getFileNameFromPath(file.webkitRelativePath || file.name)
      fileMap.set(pathKey, file)
    })

    const metadataFile = fileMap.get(BACKUP_FOLDER_FILE_NAMES.metadata)
    if (!metadataFile) {
      if (files.length === 1) {
        const onlyFile = files[0]
        return this.restoreBackup(await onlyFile.text())
      }

      throw new Error('A pasta de backup precisa conter o arquivo metadata.json.')
    }

    let metadataContent: unknown
    try {
      metadataContent = JSON.parse(await metadataFile.text()) as unknown
    } catch {
      throw new Error('Arquivo metadata.json inválido.')
    }

    if (!isBackupFolderMetadata(metadataContent)) {
      throw new Error('Arquivo metadata.json inválido.')
    }

    const parseJsonFile = async <T>(fileName: string, fallbackValue: T): Promise<T> => {
      const file = fileMap.get(fileName)
      if (!file) {
        return fallbackValue
      }

      return JSON.parse(await file.text()) as T
    }

    const bundle: BackupFolderBundle = {
      metadata: metadataContent,
      categories: await parseJsonFile<CategoryItem[]>(BACKUP_FOLDER_FILE_NAMES.categories, []),
      transactions: await parseJsonFile<Transaction[]>(BACKUP_FOLDER_FILE_NAMES.transactions, []),
      goals: await parseJsonFile<Goal[]>(BACKUP_FOLDER_FILE_NAMES.goals, []),
      transactionSettings: await parseJsonFile<TransactionSettings | null>(
        BACKUP_FOLDER_FILE_NAMES.transactionSettings,
        null
      ),
      businessSettings: await parseJsonFile<BackupBusinessSettings | null>(
        BACKUP_FOLDER_FILE_NAMES.businessSettings,
        null
      ),
      financialAudit: await parseJsonFile<BackupFinancialAuditSettings | null>(
        BACKUP_FOLDER_FILE_NAMES.financialAudit,
        null
      )
    }

    return restoreStructuredBackup(bundle)
  }
}
