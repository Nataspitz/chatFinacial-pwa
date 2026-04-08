interface UserMetaCarrier {
  user_metadata?: Record<string, unknown>
}

export const isAccountSetupComplete = (user: UserMetaCarrier | null): boolean => {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>

  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''
  const phone = typeof meta.phone === 'string' ? meta.phone.trim() : ''
  const companyName = typeof meta.company_name === 'string' ? meta.company_name.trim() : ''
  const preferredCurrency = typeof meta.preferred_currency === 'string' ? meta.preferred_currency.trim() : ''

  const noInitialInvestment = Boolean(meta.no_initial_investment)
  const investmentBase =
    typeof meta.investment_base_amount === 'number'
      ? meta.investment_base_amount
      : typeof meta.investment_base_amount === 'string'
        ? Number(meta.investment_base_amount.replace(',', '.'))
        : Number.NaN

  const hasValidInvestmentBase = Number.isFinite(investmentBase) && investmentBase >= 0
  const investmentConfigured = noInitialInvestment || hasValidInvestmentBase

  return Boolean(fullName && phone && companyName && preferredCurrency.length === 3 && investmentConfigured)
}
