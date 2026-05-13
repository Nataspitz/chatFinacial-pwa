import { supabase } from '../lib/supabase'

interface BusinessSettingsRow {
  company_id?: string
  investment_base_amount?: number | null
  no_initial_investment?: boolean | null
  account_balance_base_amount?: number | null
  account_balance_base_date?: string | null
  account_balance_locked_at?: string | null
  created_at?: string | null
  updated_at?: string | null
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

const BUSINESS_SETTINGS_SELECT_COLUMNS = [
  'company_id',
  'investment_base_amount',
  'no_initial_investment',
  'account_balance_base_amount',
  'account_balance_base_date',
  'account_balance_locked_at',
  'created_at',
  'updated_at'
] as const

let cachedBusinessSettingsSelectColumns = [...BUSINESS_SETTINGS_SELECT_COLUMNS]

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

const getCurrentIsoDateTime = (): string => new Date().toISOString()

const buildSelectClause = (columns: string[]): string => columns.join(', ')

const removeColumnFromSelect = (columns: string[], column: string): string[] => columns.filter((item) => item !== column)

const removeColumnFromPayload = (payload: Record<string, unknown>, column: string): Record<string, unknown> => {
  if (!(column in payload)) {
    return payload
  }

  const { [column]: _removed, ...nextPayload } = payload
  return nextPayload
}

const extractMissingColumnName = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const combined = `${message} ${details} ${hint}`
  const normalized = combined.toLowerCase()

  if (!(normalized.includes('column') && normalized.includes('does not exist'))) {
    return null
  }

  const columnMatch = combined.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)
  if (columnMatch?.[1]) {
    return columnMatch[1].toLowerCase()
  }

  return null
}

const normalizeRow = (data: BusinessSettingsRow, fallbackUserId: string): BusinessSettings => {
  const nowIso = getCurrentIsoDateTime()
  return {
    company_id: typeof data.company_id === 'string' && data.company_id.length > 0 ? data.company_id : fallbackUserId,
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
    created_at: typeof data.created_at === 'string' && data.created_at.length > 0 ? data.created_at : nowIso,
    updated_at: typeof data.updated_at === 'string' && data.updated_at.length > 0 ? data.updated_at : nowIso
  }
}

const selectBusinessSettingsRowWithFallback = async (userId: string): Promise<BusinessSettingsRow | null> => {
  const MAX_ATTEMPTS = 8
  let workingColumns = [...cachedBusinessSettingsSelectColumns]

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from('business_settings')
      .select(buildSelectClause(workingColumns))
      .eq('company_id', userId)
      .maybeSingle()

    if (!error) {
      cachedBusinessSettingsSelectColumns = [...workingColumns]
      return data as BusinessSettingsRow | null
    }

    const missingColumn = extractMissingColumnName(error)
    if (!missingColumn || missingColumn === 'company_id' || !workingColumns.includes(missingColumn)) {
      throw error
    }

    const nextColumns = removeColumnFromSelect(workingColumns, missingColumn)
    if (nextColumns.length === workingColumns.length || nextColumns.length === 0) {
      throw error
    }

    workingColumns = nextColumns
  }

  throw new Error('Não foi possível carregar configurações empresariais por incompatibilidade de schema.')
}

const insertBusinessSettingsRowWithFallback = async (
  payload: Record<string, unknown>
): Promise<BusinessSettingsRow> => {
  const MAX_ATTEMPTS = 8
  let workingPayload = payload
  let workingColumns = [...cachedBusinessSettingsSelectColumns]

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from('business_settings')
      .insert(workingPayload)
      .select(buildSelectClause(workingColumns))
      .single()

    if (!error) {
      cachedBusinessSettingsSelectColumns = [...workingColumns]
      return data as BusinessSettingsRow
    }

    const missingColumn = extractMissingColumnName(error)
    if (!missingColumn || missingColumn === 'company_id') {
      throw error
    }

    let changed = false
    if (missingColumn in workingPayload) {
      workingPayload = removeColumnFromPayload(workingPayload, missingColumn)
      changed = true
    }

    if (workingColumns.includes(missingColumn)) {
      const nextColumns = removeColumnFromSelect(workingColumns, missingColumn)
      if (nextColumns.length > 0) {
        workingColumns = nextColumns
        changed = true
      }
    }

    if (!changed) {
      throw error
    }
  }

  throw new Error('Não foi possível criar configurações empresariais por incompatibilidade de schema.')
}

const upsertBusinessSettingsRowWithFallback = async (
  payload: Record<string, unknown>,
  userId: string
): Promise<BusinessSettingsRow> => {
  const MAX_ATTEMPTS = 8
  let workingPayload = payload
  let workingColumns = [...cachedBusinessSettingsSelectColumns]

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase
      .from('business_settings')
      .upsert(workingPayload, { onConflict: 'company_id' })
      .select(buildSelectClause(workingColumns))
      .single()

    if (!error) {
      cachedBusinessSettingsSelectColumns = [...workingColumns]
      return data as BusinessSettingsRow
    }

    const missingColumn = extractMissingColumnName(error)
    if (!missingColumn || missingColumn === 'company_id') {
      throw error
    }

    let changed = false
    if (missingColumn in workingPayload) {
      workingPayload = removeColumnFromPayload(workingPayload, missingColumn)
      changed = true
    }

    if (workingColumns.includes(missingColumn)) {
      const nextColumns = removeColumnFromSelect(workingColumns, missingColumn)
      if (nextColumns.length > 0) {
        workingColumns = nextColumns
        changed = true
      }
    }

    if (!changed) {
      throw error
    }
  }

  throw new Error('Não foi possível salvar configurações empresariais por incompatibilidade de schema.')
}

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

const ensureBusinessSettings = async (userId: string): Promise<BusinessSettings> => {
  const data = await selectBusinessSettingsRowWithFallback(userId)

  if (data) {
    return normalizeRow(data, userId)
  }

  const insertPayload: Record<string, unknown> = {
    company_id: userId,
    investment_base_amount: null,
    no_initial_investment: false,
    account_balance_base_amount: 0,
    account_balance_base_date: getTodayDate(),
    account_balance_locked_at: null
  }

  const inserted = await insertBusinessSettingsRowWithFallback(insertPayload)

  return normalizeRow(inserted, userId)
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

    const data = await upsertBusinessSettingsRowWithFallback(nextPayload, userId)

    return normalizeRow(data, userId)
  }
}
