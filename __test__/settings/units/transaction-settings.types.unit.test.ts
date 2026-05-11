import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  getDefaultConfirmedByType,
  getDefaultPaymentMethodByType,
  normalizeTransactionBySettings,
  validateTransactionBySettings
} from '../../../src/types/transaction-settings.types'
import type { Transaction } from '../../../src/types/transaction.types'

const baseTransaction: Transaction = {
  id: 'tx-1',
  type: 'saida',
  category: 'Operacional',
  amount: 120,
  description: 'Teste',
  date: '2026-04-17',
  isConfirmed: true,
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 120,
  isInstallment: false
}

describe('transaction settings helpers', () => {
  it('retorna metodo de pagamento padrao por tipo', () => {
    expect(getDefaultPaymentMethodByType(DEFAULT_TRANSACTION_SETTINGS, 'entrada')).toBe('pix')
    expect(getDefaultPaymentMethodByType(DEFAULT_TRANSACTION_SETTINGS, 'saida')).toBe('pix')
  })

  it('retorna confirmado padrao por tipo', () => {
    expect(getDefaultConfirmedByType(DEFAULT_TRANSACTION_SETTINGS, 'entrada', '2026-04-17')).toBe(true)
    expect(getDefaultConfirmedByType(DEFAULT_TRANSACTION_SETTINGS, 'saida', '2026-04-17')).toBe(true)
    expect(getDefaultConfirmedByType(DEFAULT_TRANSACTION_SETTINGS, 'entrada', '2999-01-01')).toBe(false)
    expect(getDefaultConfirmedByType(DEFAULT_TRANSACTION_SETTINGS, 'saida', '2999-01-01')).toBe(false)
  })

  it('normaliza transacao nao credito para parcela unica', () => {
    const normalized = normalizeTransactionBySettings(
      { ...baseTransaction, paymentMethod: 'debito', installmentCount: 4, installmentNumber: 3, isInstallment: true },
      DEFAULT_TRANSACTION_SETTINGS
    )

    expect(normalized.installmentCount).toBe(1)
    expect(normalized.installmentNumber).toBe(1)
    expect(normalized.isInstallment).toBe(false)
  })

  it('valida inconsistencias de valor e parcelas', () => {
    const invalidValue = validateTransactionBySettings({ ...baseTransaction, amount: 0 }, DEFAULT_TRANSACTION_SETTINGS)
    expect(invalidValue).toContain('maior que zero')

    const invalidCredit = validateTransactionBySettings(
      { ...baseTransaction, paymentMethod: 'credito', installmentCount: 0 },
      DEFAULT_TRANSACTION_SETTINGS
    )
    expect(invalidCredit).toContain('1 e 48')
  })
})
