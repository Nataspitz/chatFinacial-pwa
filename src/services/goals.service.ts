import { supabase } from '../lib/supabase'
import type { Goal, GoalAllocationType, GoalPlanningType, GoalStatus } from '../types/goal.types'

interface GoalRow {
  id: string
  title: string
  target_amount: number
  planning_type?: string | null
  reserved_amount?: number | null
  counts_as_reserved?: boolean | null
  allocation_type?: string | null
  allocation_value?: number | null
  linked_categories?: string[] | null
  status: GoalStatus
  is_system: boolean
  system_key: string | null
  created_at: string | null
  updated_at: string | null
}

interface CreateGoalPayload {
  title: string
  targetAmount: number
  planningType?: GoalPlanningType
  reservedAmount?: number
  countsAsReserved?: boolean
  allocationType?: GoalAllocationType
  allocationValue?: number
  linkedCategories?: string[]
}

interface UpdateGoalPayload {
  title: string
  targetAmount: number
  planningType?: GoalPlanningType
  reservedAmount?: number
  countsAsReserved?: boolean
  allocationType?: GoalAllocationType
  allocationValue?: number
  linkedCategories?: string[]
}

interface SyncSystemGoalPayload {
  systemKey: string
  title: string
  targetAmount: number
  planningType?: GoalPlanningType
  reservedAmount?: number
  countsAsReserved?: boolean
  allocationType?: GoalAllocationType
  allocationValue?: number
  linkedCategories?: string[]
}

const LEGACY_GOAL_SELECT_FIELDS = 'id, title, target_amount, status, is_system, system_key, created_at, updated_at'
const GOAL_SELECT_FIELDS =
  'id, title, target_amount, planning_type, reserved_amount, counts_as_reserved, allocation_type, allocation_value, linked_categories, status, is_system, system_key, created_at, updated_at'
const CASH_PLANNING_COLUMNS = new Set([
  'planning_type',
  'reserved_amount',
  'counts_as_reserved',
  'allocation_type',
  'allocation_value',
  'linked_categories'
])

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

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizePlanningType = (value: unknown, isSystem: boolean): GoalPlanningType => {
  if (value === 'goal' || value === 'reserve' || value === 'bill_provision') {
    return value
  }

  return isSystem ? 'bill_provision' : 'goal'
}

const normalizeAllocationType = (value: unknown): GoalAllocationType => {
  if (value === 'fixed' || value === 'percentage') {
    return value
  }

  return 'fixed'
}

const normalizeLinkedCategories = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item).trim().replace(/\s+/g, ' '))
    .filter(Boolean)
}

const getErrorText = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return String(error ?? '')
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''

  return `${code} ${message} ${details} ${hint}`.toLowerCase()
}

const extractMissingColumnName = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const combined = `${message} ${details} ${hint}`
  const columnMatch = combined.match(/column\s+"?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)"?\s+does not exist/i)
  if (columnMatch?.[1]) {
    return columnMatch[1].toLowerCase()
  }

  const schemaCacheMatch = combined.match(/could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i)
  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1].toLowerCase()
  }

  return null
}

const isMissingCashPlanningColumnError = (error: unknown): boolean => {
  const missingColumn = extractMissingColumnName(error)
  if (missingColumn && CASH_PLANNING_COLUMNS.has(missingColumn)) {
    return true
  }

  const errorText = getErrorText(error)
  return Array.from(CASH_PLANNING_COLUMNS).some((column) => errorText.includes(column))
}

const buildCashPlanningPayload = (
  payload: CreateGoalPayload | UpdateGoalPayload | SyncSystemGoalPayload
): Record<string, unknown> => ({
  planning_type: payload.planningType ?? 'goal',
  reserved_amount: Math.max(0, toFiniteNumber(payload.reservedAmount, 0)),
  counts_as_reserved: payload.countsAsReserved ?? true,
  allocation_type: payload.allocationType ?? 'fixed',
  allocation_value: Math.max(0, toFiniteNumber(payload.allocationValue, 0)),
  linked_categories: normalizeLinkedCategories(payload.linkedCategories)
})

const mapRow = (row: GoalRow): Goal => ({
  id: row.id,
  title: row.title,
  targetAmount: Number(row.target_amount),
  planningType: normalizePlanningType(row.planning_type, Boolean(row.is_system)),
  reservedAmount: Math.max(0, toFiniteNumber(row.reserved_amount, 0)),
  countsAsReserved: row.counts_as_reserved ?? true,
  allocationType: normalizeAllocationType(row.allocation_type),
  allocationValue: Math.max(0, toFiniteNumber(row.allocation_value, 0)),
  linkedCategories: normalizeLinkedCategories(row.linked_categories),
  status: row.status,
  isSystem: Boolean(row.is_system),
  systemKey: row.system_key,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined
})

export const goalsService = {
  getGoals: async (): Promise<Goal[]> => {
    const userId = await getUserId()

    const response = await supabase
      .from('goals')
      .select(GOAL_SELECT_FIELDS)
      .eq('user_id', userId)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    if (!response.error) {
      return ((response.data ?? []) as GoalRow[]).map(mapRow)
    }

    if (!isMissingCashPlanningColumnError(response.error)) {
      throw response.error
    }

    const legacyResponse = await supabase
      .from('goals')
      .select(LEGACY_GOAL_SELECT_FIELDS)
      .eq('user_id', userId)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    if (legacyResponse.error) {
      throw legacyResponse.error
    }

    return ((legacyResponse.data ?? []) as GoalRow[]).map(mapRow)
  },

  createGoal: async (payload: CreateGoalPayload): Promise<Goal> => {
    const userId = await getUserId()
    const basePayload = {
      user_id: userId,
      title: payload.title.trim(),
      target_amount: payload.targetAmount,
      status: 'active',
      is_system: false,
      system_key: null
    }

    const response = await supabase
      .from('goals')
      .insert({
        ...basePayload,
        ...buildCashPlanningPayload(payload)
      })
      .select(GOAL_SELECT_FIELDS)
      .single()

    if (!response.error) {
      return mapRow(response.data as GoalRow)
    }

    if (!isMissingCashPlanningColumnError(response.error)) {
      throw response.error
    }

    const legacyResponse = await supabase
      .from('goals')
      .insert(basePayload)
      .select(LEGACY_GOAL_SELECT_FIELDS)
      .single()

    if (legacyResponse.error) {
      throw legacyResponse.error
    }

    return mapRow(legacyResponse.data as GoalRow)
  },

  updateGoal: async (goalId: string, payload: UpdateGoalPayload): Promise<Goal> => {
    const userId = await getUserId()
    const basePayload = {
      title: payload.title.trim(),
      target_amount: payload.targetAmount
    }

    const response = await supabase
      .from('goals')
      .update({
        ...basePayload,
        ...buildCashPlanningPayload(payload)
      })
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('is_system', false)
      .select(GOAL_SELECT_FIELDS)
      .single()

    if (!response.error) {
      return mapRow(response.data as GoalRow)
    }

    if (!isMissingCashPlanningColumnError(response.error)) {
      throw response.error
    }

    const legacyResponse = await supabase
      .from('goals')
      .update(basePayload)
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('is_system', false)
      .select(LEGACY_GOAL_SELECT_FIELDS)
      .single()

    if (legacyResponse.error) {
      throw legacyResponse.error
    }

    return mapRow(legacyResponse.data as GoalRow)
  },

  updateGoalStatus: async (goalId: string, status: GoalStatus): Promise<Goal> => {
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select(LEGACY_GOAL_SELECT_FIELDS)
      .single()

    if (error) {
      throw error
    }

    return mapRow(data as GoalRow)
  },

  syncSystemGoal: async (payload: SyncSystemGoalPayload): Promise<void> => {
    const userId = await getUserId()

    const response = await supabase
      .from('goals')
      .upsert(
        {
          user_id: userId,
          system_key: payload.systemKey,
          title: payload.title.trim(),
          target_amount: payload.targetAmount,
          is_system: true,
          ...buildCashPlanningPayload({
            planningType: 'bill_provision',
            reservedAmount: 0,
            countsAsReserved: false,
            allocationType: 'fixed',
            allocationValue: 0,
            ...payload
          })
        },
        { onConflict: 'user_id,system_key' }
      )

    if (!response.error) {
      return
    }

    if (!isMissingCashPlanningColumnError(response.error)) {
      throw response.error
    }

    const { error } = await supabase
      .from('goals')
      .upsert(
        {
          user_id: userId,
          system_key: payload.systemKey,
          title: payload.title.trim(),
          target_amount: payload.targetAmount,
          is_system: true
        },
        { onConflict: 'user_id,system_key' }
      )

    if (error) {
      throw error
    }
  }
}
