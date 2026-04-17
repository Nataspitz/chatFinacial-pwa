import {
  DEFAULT_TRANSACTION_SETTINGS,
  type TransactionSettings
} from '../../../src/types/transaction-settings.types'

export const settingsMockUser = {
  id: 'user-settings-1',
  email: 'nataspitz81@gmail.com',
  user_metadata: {
    full_name: 'Nata Spitz'
  }
}

export const customTransactionSettingsFixture: TransactionSettings = {
  ...DEFAULT_TRANSACTION_SETTINGS,
  defaultPaymentMethodEntrada: 'credito',
  defaultPaymentMethodSaida: 'debito',
  defaultConfirmedEntrada: false,
  defaultConfirmedSaida: false,
  defaultMonthlyCostSaida: true,
  enforceConsistency: false,
  allowCreditWithoutInstallments: false
}
