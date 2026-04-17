interface UserMetaCarrier {
  user_metadata?: Record<string, unknown>
}

export const isAccountSetupComplete = (user: UserMetaCarrier | null): boolean => {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>

  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''
  const phone = typeof meta.phone === 'string' ? meta.phone.trim() : ''
  const companyName = typeof meta.company_name === 'string' ? meta.company_name.trim() : ''
  const preferredCurrency = typeof meta.preferred_currency === 'string' ? meta.preferred_currency.trim() : ''

  return Boolean(fullName && phone && companyName && preferredCurrency.length === 3)
}
