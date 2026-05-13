import { supabase } from '../lib/supabase'
import type { Goal, GoalStatus } from '../types/goal.types'

interface GoalRow {
  id: string
  title: string
  target_amount: number
  status: GoalStatus
  is_system: boolean
  system_key: string | null
  created_at: string | null
  updated_at: string | null
}

interface CreateGoalPayload {
  title: string
  targetAmount: number
}

interface UpdateGoalPayload {
  title: string
  targetAmount: number
}

interface SyncSystemGoalPayload {
  systemKey: string
  title: string
  targetAmount: number
}

const GOAL_SELECT_FIELDS = 'id, title, target_amount, status, is_system, system_key, created_at, updated_at'

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

const mapRow = (row: GoalRow): Goal => ({
  id: row.id,
  title: row.title,
  targetAmount: Number(row.target_amount),
  status: row.status,
  isSystem: Boolean(row.is_system),
  systemKey: row.system_key,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined
})

export const goalsService = {
  getGoals: async (): Promise<Goal[]> => {
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('goals')
      .select(GOAL_SELECT_FIELDS)
      .eq('user_id', userId)
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as GoalRow[]).map(mapRow)
  },

  createGoal: async (payload: CreateGoalPayload): Promise<Goal> => {
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: payload.title.trim(),
        target_amount: payload.targetAmount,
        status: 'active',
        is_system: false,
        system_key: null
      })
      .select(GOAL_SELECT_FIELDS)
      .single()

    if (error) {
      throw error
    }

    return mapRow(data as GoalRow)
  },

  updateGoal: async (goalId: string, payload: UpdateGoalPayload): Promise<Goal> => {
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('goals')
      .update({
        title: payload.title.trim(),
        target_amount: payload.targetAmount
      })
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('is_system', false)
      .select(GOAL_SELECT_FIELDS)
      .single()

    if (error) {
      throw error
    }

    return mapRow(data as GoalRow)
  },

  updateGoalStatus: async (goalId: string, status: GoalStatus): Promise<Goal> => {
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select(GOAL_SELECT_FIELDS)
      .single()

    if (error) {
      throw error
    }

    return mapRow(data as GoalRow)
  },

  syncSystemGoal: async (payload: SyncSystemGoalPayload): Promise<void> => {
    const userId = await getUserId()

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
