import { DEFAULT_TRANSACTION_SETTINGS } from '../../../src/types/transaction-settings.types'

export const customSettingsMock = {
  ...DEFAULT_TRANSACTION_SETTINGS,
  defaultPaymentMethodEntrada: 'credito' as const,
  defaultPaymentMethodSaida: 'debito' as const,
  defaultMonthlyCostSaida: true
}
