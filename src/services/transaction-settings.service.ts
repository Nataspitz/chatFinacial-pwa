import { supabase } from '../lib/supabase'
import { DEFAULT_TRANSACTION_SETTINGS, type TransactionSettings } from '../types/transaction-settings.types'
import type { PaymentMethod } from '../types/transaction.types'

interface TransactionSettingsRow {
  default_payment_method_entrada: PaymentMethod
  default_payment_method_saida: PaymentMethod
  default_confirmed_entrada: boolean
  default_confirmed_saida: boolean
  default_monthly_cost_saida: boolean
  enforce_consistency: boolean
  allow_credit_without_installments: boolean
}

let transactionSettingsCache: TransactionSettings | null = null

const mapRowToSettings = (row: Partial<TransactionSettingsRow> | null | undefined): TransactionSettings => ({
  defaultPaymentMethodEntrada: row?.default_payment_method_entrada ?? DEFAULT_TRANSACTION_SETTINGS.defaultPaymentMethodEntrada,
  defaultPaymentMethodSaida: row?.default_payment_method_saida ?? DEFAULT_TRANSACTION_SETTINGS.defaultPaymentMethodSaida,
  defaultConfirmedEntrada: row?.default_confirmed_entrada ?? DEFAULT_TRANSACTION_SETTINGS.defaultConfirmedEntrada,
  defaultConfirmedSaida: row?.default_confirmed_saida ?? DEFAULT_TRANSACTION_SETTINGS.defaultConfirmedSaida,
  defaultMonthlyCostSaida: row?.default_monthly_cost_saida ?? DEFAULT_TRANSACTION_SETTINGS.defaultMonthlyCostSaida,
  enforceConsistency: row?.enforce_consistency ?? DEFAULT_TRANSACTION_SETTINGS.enforceConsistency,
  allowCreditWithoutInstallments: row?.allow_credit_without_installments ?? DEFAULT_TRANSACTION_SETTINGS.allowCreditWithoutInstallments
})

const mapSettingsToRow = (settings: TransactionSettings): TransactionSettingsRow => ({
  default_payment_method_entrada: settings.defaultPaymentMethodEntrada,
  default_payment_method_saida: settings.defaultPaymentMethodSaida,
  default_confirmed_entrada: settings.defaultConfirmedEntrada,
  default_confirmed_saida: settings.defaultConfirmedSaida,
  default_monthly_cost_saida: settings.defaultMonthlyCostSaida,
  enforce_consistency: settings.enforceConsistency,
  allow_credit_without_installments: settings.allowCreditWithoutInstallments
})

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  if (!data.user?.id) {
    throw new Error('Usuário não autenticado')
  }

  return data.user.id
}

export const transactionSettingsService = {
  clearCache(): void {
    transactionSettingsCache = null
  },

  async getSettings(forceRefresh = false): Promise<TransactionSettings> {
    if (!forceRefresh && transactionSettingsCache) {
      return transactionSettingsCache
    }

    const userId = await getUserId()
    const { data, error } = await supabase
      .from('transaction_settings')
      .select(
        'default_payment_method_entrada, default_payment_method_saida, default_confirmed_entrada, default_confirmed_saida, default_monthly_cost_saida, enforce_consistency, allow_credit_without_installments'
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    const settings = mapRowToSettings(data as Partial<TransactionSettingsRow> | null)
    transactionSettingsCache = settings
    return settings
  },

  async saveSettings(settings: TransactionSettings): Promise<TransactionSettings> {
    const userId = await getUserId()
    const payload = {
      user_id: userId,
      ...mapSettingsToRow(settings)
    }

    const { data, error } = await supabase
      .from('transaction_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select(
        'default_payment_method_entrada, default_payment_method_saida, default_confirmed_entrada, default_confirmed_saida, default_monthly_cost_saida, enforce_consistency, allow_credit_without_installments'
      )
      .single()

    if (error) {
      throw error
    }

    const normalized = mapRowToSettings(data as Partial<TransactionSettingsRow>)
    transactionSettingsCache = normalized
    return normalized
  }
}
