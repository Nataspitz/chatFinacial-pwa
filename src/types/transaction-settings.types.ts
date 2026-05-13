import type { PaymentMethod, Transaction } from './transaction.types'

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

const getTodayDate = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export interface TransactionSettings {
  defaultPaymentMethodEntrada: PaymentMethod
  defaultPaymentMethodSaida: PaymentMethod
  defaultConfirmedEntrada: boolean
  defaultConfirmedSaida: boolean
  defaultMonthlyCostSaida: boolean
  enforceConsistency: boolean
  allowCreditWithoutInstallments: boolean
}

export const DEFAULT_TRANSACTION_SETTINGS: TransactionSettings = {
  defaultPaymentMethodEntrada: 'pix',
  defaultPaymentMethodSaida: 'pix',
  defaultConfirmedEntrada: true,
  defaultConfirmedSaida: true,
  defaultMonthlyCostSaida: false,
  enforceConsistency: true,
  allowCreditWithoutInstallments: true
}

export const getDefaultPaymentMethodByType = (
  settings: TransactionSettings,
  type: Transaction['type']
): PaymentMethod => (type === 'entrada' ? settings.defaultPaymentMethodEntrada : settings.defaultPaymentMethodSaida)

export const getDefaultConfirmedByType = (
  _settings: TransactionSettings,
  _type: Transaction['type'],
  date: string
): boolean => normalizeDate(date) <= getTodayDate()

export const normalizeTransactionBySettings = (
  transaction: Transaction,
  settings: TransactionSettings
): Transaction => {
  if (!settings.enforceConsistency) {
    return transaction
  }

  const isCredit = transaction.paymentMethod === 'credito'
  const installmentCount = isCredit ? Math.max(1, Math.min(48, Math.floor(transaction.installmentCount || 1))) : 1
  const isInstallment = isCredit && installmentCount > 1

  return {
    ...transaction,
    installmentCount,
    installmentNumber: isCredit ? Math.max(1, Math.min(transaction.installmentNumber || 1, installmentCount)) : 1,
    installmentGroupId: isInstallment ? transaction.installmentGroupId ?? crypto.randomUUID() : null,
    isInstallment,
    isMonthlyCost: transaction.type === 'saida' ? Boolean(transaction.isMonthlyCost) && !isInstallment : false,
    totalAmount: isInstallment ? Math.max(transaction.totalAmount, transaction.amount) : transaction.amount
  }
}

export const validateTransactionBySettings = (
  transaction: Transaction,
  settings: TransactionSettings
): string | null => {
  if (!settings.enforceConsistency) {
    return null
  }

  if (!(transaction.amount > 0)) {
    return 'Informe um valor valido maior que zero.'
  }

  if (transaction.paymentMethod === 'credito') {
    if (!Number.isInteger(transaction.installmentCount) || transaction.installmentCount < 1 || transaction.installmentCount > 48) {
      return 'Parcelas no crédito devem ficar entre 1 e 48.'
    }
  } else if (transaction.installmentCount !== 1 || transaction.installmentNumber !== 1 || transaction.isInstallment) {
    return 'Pagamento sem crédito deve ter parcela única.'
  }

  if (transaction.isMonthlyCost && (transaction.type !== 'saida' || transaction.isInstallment)) {
    return 'Custo mensal só é permitido para saída sem parcelamento.'
  }

  return null
}
