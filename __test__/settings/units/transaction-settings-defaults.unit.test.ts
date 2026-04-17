import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TRANSACTION_SETTINGS,
  getDefaultConfirmedByType,
  getDefaultPaymentMethodByType
} from '../../../src/types/transaction-settings.types'

describe('Transaction settings defaults - unit', () => {
  it('mantem defaults esperados da V1 CFO', () => {
    expect(DEFAULT_TRANSACTION_SETTINGS).toEqual({
      defaultPaymentMethodEntrada: 'pix',
      defaultPaymentMethodSaida: 'pix',
      defaultConfirmedEntrada: true,
      defaultConfirmedSaida: true,
      defaultMonthlyCostSaida: false,
      enforceConsistency: true,
      allowCreditWithoutInstallments: true
    })
  })

  it('resolve defaults por tipo para pagamento e confirmado', () => {
    expect(getDefaultPaymentMethodByType(DEFAULT_TRANSACTION_SETTINGS, 'entrada')).toBe('pix')
    expect(getDefaultPaymentMethodByType(DEFAULT_TRANSACTION_SETTINGS, 'saida')).toBe('pix')
    expect(getDefaultConfirmedByType(DEFAULT_TRANSACTION_SETTINGS, 'entrada', '2026-04-17')).toBe(true)
    expect(getDefaultConfirmedByType(DEFAULT_TRANSACTION_SETTINGS, 'saida', '2026-04-17')).toBe(true)
  })
})
