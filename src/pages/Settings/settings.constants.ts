import type { PaymentMethod } from '../../types/transaction.types'
import type { AccountSettingsDraft, SettingsSection } from './settings.types'

export const settingsSections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'transactions', label: 'Transações' },
  { id: 'appearance', label: 'Aparência' },
  { id: 'account', label: 'Conta' }
]

export const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'credito', label: 'Crédito' }
]

export const toInitialAccountDraft = (user: { user_metadata?: Record<string, unknown> } | null): AccountSettingsDraft => {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
  return {
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : '',
    phone: typeof metadata.phone === 'string' ? metadata.phone : '',
    companyName: typeof metadata.company_name === 'string' ? metadata.company_name : '',
    preferredCurrency: typeof metadata.preferred_currency === 'string' ? metadata.preferred_currency : 'BRL'
  }
}
