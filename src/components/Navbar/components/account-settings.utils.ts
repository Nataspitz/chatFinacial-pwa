import type { User } from '@supabase/supabase-js'

export interface AccountSettingsForm {
  fullName: string
  phone: string
  companyName: string
  preferredCurrency: string
}

export const toInitialForm = (user: User | null): AccountSettingsForm => {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>

  return {
    fullName: typeof meta.full_name === 'string' ? meta.full_name : '',
    phone: typeof meta.phone === 'string' ? meta.phone : '',
    companyName: typeof meta.company_name === 'string' ? meta.company_name : '',
    preferredCurrency: typeof meta.preferred_currency === 'string' ? meta.preferred_currency : 'BRL'
  }
}
