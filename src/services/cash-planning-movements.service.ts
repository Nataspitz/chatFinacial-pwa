import { supabase } from '../lib/supabase'
import type { Goal, GoalPlanningType } from '../types/goal.types'
import type { Transaction } from '../types/transaction.types'
import { goalsService } from './goals.service'

export interface CashPlanningOption {
  id: string
  title: string
  planningType: GoalPlanningType
  reservedAmount: number
  targetAmount: number
}

export interface CashPlanningTransactionAllocation {
  id: string
  goalId: string
  amount: number
  direction: 'IN' | 'OUT'
}

interface GoalReservationRow {
  id: string
  title: string
  reserved_amount?: number | null
  target_amount: number
  status: string
  user_id: string
}

interface ExistingMovementRow {
  id: string
  goal_id: string
  amount: number
  direction: 'IN' | 'OUT'
}

interface ApplyTransactionAllocationParams {
  transaction: Transaction
  goalId: string | null
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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

const isMissingCashPlanningSchemaError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const details = 'details' in error && typeof error.details === 'string' ? error.details : ''
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : ''
  const combined = `${message} ${details} ${hint}`.toLowerCase()

  return (
    combined.includes('cash_planning_movements')
    || combined.includes('reserved_amount')
    || combined.includes('schema cache')
    || combined.includes('does not exist')
  )
}

const getSchemaErrorMessage = (): string =>
  'A repartição ainda não está preparada no Supabase. Aplique as migrations de planejamento de caixa antes de vincular transações.'

const getDirection = (transaction: Transaction): 'IN' | 'OUT' => (transaction.type === 'entrada' ? 'IN' : 'OUT')

const getReferenceMonth = (date: string): string | null => {
  const normalized = date.match(/^\d{4}-\d{2}/)?.[0]
  return normalized ? `${normalized}-01` : null
}

const mapGoalToOption = (goal: Goal): CashPlanningOption => ({
  id: goal.id,
  title: goal.title,
  planningType: goal.planningType ?? 'goal',
  reservedAmount: Math.max(0, toFiniteNumber(goal.reservedAmount, 0)),
  targetAmount: Math.max(0, toFiniteNumber(goal.targetAmount, 0))
})

const reverseMovement = (reservedAmount: number, movement: ExistingMovementRow): number => {
  const amount = Math.max(0, toFiniteNumber(movement.amount, 0))
  return movement.direction === 'IN'
    ? Math.max(0, reservedAmount - amount)
    : reservedAmount + amount
}

export const cashPlanningMovementsService = {
  listTransactionAllocationOptions: async (): Promise<CashPlanningOption[]> => {
    const goals = await goalsService.getGoals()
    return goals
      .filter((goal) => goal.status === 'active' && !goal.isSystem)
      .map(mapGoalToOption)
  },

  getTransactionAllocation: async (transactionId: string): Promise<CashPlanningTransactionAllocation | null> => {
    const response = await supabase
      .from('cash_planning_movements')
      .select('id, goal_id, amount, direction')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (response.error) {
      if (isMissingCashPlanningSchemaError(response.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw response.error
    }

    const movement = response.data as ExistingMovementRow | null
    if (!movement) {
      return null
    }

    return {
      id: movement.id,
      goalId: movement.goal_id,
      amount: Math.max(0, toFiniteNumber(movement.amount, 0)),
      direction: movement.direction
    }
  },

  removeTransactionAllocation: async (transaction: Transaction): Promise<void> => {
    const userId = await getUserId()
    const allocation = await cashPlanningMovementsService.getTransactionAllocation(transaction.id)
    if (!allocation) {
      return
    }

    const goalLookup = await supabase
      .from('goals')
      .select('id, title, reserved_amount, target_amount, status, user_id')
      .eq('id', allocation.goalId)
      .eq('user_id', userId)
      .maybeSingle()

    if (goalLookup.error) {
      if (isMissingCashPlanningSchemaError(goalLookup.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw goalLookup.error
    }

    const goal = goalLookup.data as GoalReservationRow | null
    if (goal) {
      const nextReservedAmount = reverseMovement(Math.max(0, toFiniteNumber(goal.reserved_amount, 0)), {
        id: allocation.id,
        goal_id: allocation.goalId,
        amount: allocation.amount,
        direction: allocation.direction
      })

      const updateGoalResponse = await supabase
        .from('goals')
        .update({ reserved_amount: nextReservedAmount })
        .eq('id', allocation.goalId)
        .eq('user_id', userId)

      if (updateGoalResponse.error) {
        if (isMissingCashPlanningSchemaError(updateGoalResponse.error)) {
          throw new Error(getSchemaErrorMessage())
        }
        throw updateGoalResponse.error
      }
    }

    const deleteMovementResponse = await supabase
      .from('cash_planning_movements')
      .delete()
      .eq('id', allocation.id)

    if (deleteMovementResponse.error) {
      if (isMissingCashPlanningSchemaError(deleteMovementResponse.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw deleteMovementResponse.error
    }
  },

  saveTransactionAllocation: async (transaction: Transaction, goalId: string | null): Promise<void> => {
    if (!transaction.isConfirmed) {
      throw new Error('Confirme a transação antes de vincular a uma repartição.')
    }

    if (!goalId) {
      await cashPlanningMovementsService.removeTransactionAllocation(transaction)
      return
    }

    await cashPlanningMovementsService.applyTransactionAllocation({ transaction, goalId })
  },

  applyTransactionAllocation: async ({
    transaction,
    goalId
  }: ApplyTransactionAllocationParams): Promise<void> => {
    if (!goalId || !transaction.isConfirmed) {
      return
    }

    const amount = Math.max(0, toFiniteNumber(transaction.amount, 0))
    if (amount <= 0) {
      return
    }

    const userId = await getUserId()
    const existingMovementResponse = await supabase
      .from('cash_planning_movements')
      .select('id, goal_id, amount, direction')
      .eq('transaction_id', transaction.id)
      .maybeSingle()

    if (existingMovementResponse.error) {
      if (isMissingCashPlanningSchemaError(existingMovementResponse.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw existingMovementResponse.error
    }

    const goalLookup = await supabase
      .from('goals')
      .select('id, title, reserved_amount, target_amount, status, user_id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .maybeSingle()

    if (goalLookup.error) {
      if (isMissingCashPlanningSchemaError(goalLookup.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw goalLookup.error
    }

    const goal = goalLookup.data as GoalReservationRow | null
    if (!goal || goal.status !== 'active') {
      throw new Error('Repartição não encontrada ou inativa.')
    }

    const direction = getDirection(transaction)
    const previousMovement = existingMovementResponse.data as ExistingMovementRow | null
    if (
      previousMovement
      && previousMovement.goal_id === goalId
      && previousMovement.direction === direction
      && Number(previousMovement.amount) === amount
    ) {
      return
    }

    let nextReservedAmount = Math.max(0, toFiniteNumber(goal.reserved_amount, 0))
    if (previousMovement) {
      nextReservedAmount = reverseMovement(nextReservedAmount, previousMovement)
    }

    nextReservedAmount = direction === 'IN'
      ? nextReservedAmount + amount
      : Math.max(0, nextReservedAmount - amount)

    const updateGoalResponse = await supabase
      .from('goals')
      .update({ reserved_amount: nextReservedAmount })
      .eq('id', goalId)
      .eq('user_id', userId)

    if (updateGoalResponse.error) {
      if (isMissingCashPlanningSchemaError(updateGoalResponse.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw updateGoalResponse.error
    }

    const movementPayload = {
      goal_id: goalId,
      type: 'USED_BY_TRANSACTION',
      amount,
      direction,
      reference_month: getReferenceMonth(transaction.date),
      transaction_id: transaction.id,
      note: transaction.description || transaction.category || null
    }

    const movementResponse = previousMovement
      ? await supabase
          .from('cash_planning_movements')
          .update(movementPayload)
          .eq('id', previousMovement.id)
      : await supabase
          .from('cash_planning_movements')
          .insert(movementPayload)

    if (movementResponse.error) {
      if (isMissingCashPlanningSchemaError(movementResponse.error)) {
        throw new Error(getSchemaErrorMessage())
      }
      throw movementResponse.error
    }
  }
}
