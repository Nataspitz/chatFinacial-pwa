export type SettingsSection = 'transactions' | 'appearance' | 'account'

export interface AccountSettingsDraft {
  fullName: string
  phone: string
  companyName: string
  preferredCurrency: string
}
