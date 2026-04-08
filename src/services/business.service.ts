import { supabase } from '../lib/supabase'

interface BusinessSettingsRow {
  company_id: string
  investment_base_amount: number | null
  no_initial_investment: boolean
  account_balance_base_amount: number
  account_balance_base_date: string
  account_balance_locked_at: string | null
  created_at: string
  updated_at: string
}

export interface BusinessSettings {
  company_id: string
  investment_base_amount: number | null
  no_initial_investment: boolean
  account_balance_base_amount: number
  account_balance_base_date: string
  account_balance_locked_at: string | null
  created_at: string
  updated_at: string
}

export interface UpdateBusinessSettingsPayload {
  investment_base_amount: number | null
  no_initial_investment: boolean
  account_balance_base_amount?: number
  account_balance_base_date?: string
  account_balance_locked_at?: string | null
}

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeOptionalNumeric = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeRequiredNumeric = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeRow = (data: BusinessSettingsRow): BusinessSettings => ({
  company_id: data.company_id,
  investment_base_amount: normalizeOptionalNumeric(data.investment_base_amount),
  no_initial_investment: Boolean(data.no_initial_investment),
  account_balance_base_amount: normalizeRequiredNumeric(data.account_balance_base_amount, 0),
  account_balance_base_date:
    typeof data.account_balance_base_date === 'string' && data.account_balance_base_date.match(/^\d{4}-\d{2}-\d{2}/)
      ? data.account_balance_base_date.slice(0, 10)
      : getTodayDate(),
  account_balance_locked_at:
    typeof data.account_balance_locked_at === 'string' && data.account_balance_locked_at.length > 0
      ? data.account_balance_locked_at
      : null,
  created_at: data.created_at,
  updated_at: data.updated_at
})

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  if (!data.user?.id) {
    throw new Error('Usuario nao autenticado')
  }

  return data.user.id
}

const ensureBusinessSettings = async (userId: string): Promise<BusinessSettings> => {
  const { data, error } = await supabase
    .from('business_settings')
    .select(
      'company_id, investment_base_amount, no_initial_investment, account_balance_base_amount, account_balance_base_date, account_balance_locked_at, created_at, updated_at'
    )
    .eq('company_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    return normalizeRow(data as BusinessSettingsRow)
  }

  const insertPayload = {
    company_id: userId,
    investment_base_amount: null,
    no_initial_investment: false,
    account_balance_base_amount: 0,
    account_balance_base_date: getTodayDate(),
    account_balance_locked_at: null
  }

  const { data: inserted, error: insertError } = await supabase
    .from('business_settings')
    .insert(insertPayload)
    .select(
      'company_id, investment_base_amount, no_initial_investment, account_balance_base_amount, account_balance_base_date, account_balance_locked_at, created_at, updated_at'
    )
    .single()

  if (insertError) {
    throw insertError
  }

  return normalizeRow(inserted as BusinessSettingsRow)
}

export const businessService = {
  getBusinessSettings: async (): Promise<BusinessSettings> => {
    const userId = await getUserId()
    return ensureBusinessSettings(userId)
  },

  updateBusinessSettings: async (payload: UpdateBusinessSettingsPayload): Promise<BusinessSettings> => {
    const userId = await getUserId()

    const nextPayload: Record<string, unknown> = {
      company_id: userId,
      investment_base_amount: payload.investment_base_amount,
      no_initial_investment: payload.no_initial_investment
    }

    if (payload.account_balance_base_amount !== undefined) {
      nextPayload.account_balance_base_amount = payload.account_balance_base_amount
    }

    if (payload.account_balance_base_date !== undefined) {
      nextPayload.account_balance_base_date = payload.account_balance_base_date
    }

    if (payload.account_balance_locked_at !== undefined) {
      nextPayload.account_balance_locked_at = payload.account_balance_locked_at
    }

    const { data, error } = await supabase
      .from('business_settings')
      .upsert(nextPayload, { onConflict: 'company_id' })
      .select(
        'company_id, investment_base_amount, no_initial_investment, account_balance_base_amount, account_balance_base_date, account_balance_locked_at, created_at, updated_at'
      )
      .single()

    if (error) {
      throw error
    }

    return normalizeRow(data as BusinessSettingsRow)
  }
}
