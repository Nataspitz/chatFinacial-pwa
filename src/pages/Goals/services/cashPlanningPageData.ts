import type { Goal, GoalAllocationType, GoalPlanningType } from '../../../types/goal.types'
import type { FinancialSnapshot } from '../hooks/useGoalsData'

export type CashPlanningType = 'GOAL' | 'RESERVE' | 'PROVISION'
export type CashPlanningAllocationType = 'NONE' | 'FIXED' | 'PERCENTAGE_REVENUE' | 'PERCENTAGE_RESULT'

export interface CashPlanningSummary {
  accountBalance: number
  reservedActive: number
  realFreeCash: number
  monthlyRuleTotal: number
  activeTargetAmount: number
  activePlansCount: number
}

export interface CashPlanningAlert {
  type: 'info' | 'warning' | 'danger'
  message: string
}

export interface CashPlanningCardData {
  id: string
  name: string
  planningType: CashPlanningType
  targetAmount: number
  reservedAmount: number
  progressPercentage: number
  missingAmount: number
  countsAsReserved: boolean
  allocationType: CashPlanningAllocationType
  allocationValue: number | null
  monthlyRuleEstimatedAmount: number
  forecastLabel: string
  statusLabel: string
  linkedCategories: string[]
  isSystem: boolean
  sourceGoal: Goal
}

export interface CashPlanningPageData {
  summary: CashPlanningSummary
  charts: {
    cashComposition: {
      free: number
      reserved: number
      committed: number
    }
    reservedByType: {
      goals: number
      reserves: number
      provisions: number
    }
    reservedByPlanning: Array<{
      id: string
      name: string
      reservedAmount: number
      targetAmount: number
      progressPercentage: number
    }>
  }
  alerts: CashPlanningAlert[]
  plannings: CashPlanningCardData[]
  completedPlannings: CashPlanningCardData[]
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const toPositiveNumber = (value: unknown): number => Math.max(0, toFiniteNumber(value, 0))

const normalizePlanningType = (type: GoalPlanningType | undefined): CashPlanningType => {
  if (type === 'reserve') return 'RESERVE'
  if (type === 'bill_provision') return 'PROVISION'
  return 'GOAL'
}

const normalizeAllocationType = (type: GoalAllocationType | undefined, value: number): CashPlanningAllocationType => {
  if (value <= 0) return 'NONE'
  if (type === 'percentage') return 'PERCENTAGE_REVENUE'
  return 'FIXED'
}

const getMonthlyRuleEstimate = (
  allocationType: CashPlanningAllocationType,
  allocationValue: number | null,
  snapshot: FinancialSnapshot
): number => {
  const safeValue = toPositiveNumber(allocationValue)

  if (allocationType === 'FIXED') {
    return safeValue
  }

  if (allocationType === 'PERCENTAGE_REVENUE') {
    return (toPositiveNumber(snapshot.averageMonthlyEntries) * safeValue) / 100
  }

  if (allocationType === 'PERCENTAGE_RESULT') {
    return (toPositiveNumber(snapshot.averageMonthlyResult) * safeValue) / 100
  }

  return 0
}

const getForecastLabel = (
  allocationType: CashPlanningAllocationType,
  monthlyRuleEstimatedAmount: number,
  missingAmount: number
): string => {
  if (missingAmount <= 0) {
    return 'Completo'
  }

  if (allocationType === 'NONE') {
    return 'Configure uma regra'
  }

  if (monthlyRuleEstimatedAmount <= 0) {
    return allocationType === 'FIXED' ? 'Sem previsão' : 'Sem base para previsão'
  }

  const months = Math.ceil(missingAmount / monthlyRuleEstimatedAmount)
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
}

const getStatusLabel = (goal: Goal): string => {
  if (goal.status === 'completed') return 'Concluído'
  if (goal.status === 'deleted') return 'Excluído'
  return 'Ativo'
}

const buildPlanningData = (goal: Goal, snapshot: FinancialSnapshot): CashPlanningCardData => {
  const targetAmount = toPositiveNumber(goal.targetAmount)
  const reservedAmount = toPositiveNumber(goal.reservedAmount)
  const progressPercentage = targetAmount > 0 ? clamp((reservedAmount / targetAmount) * 100, 0, 100) : 0
  const missingAmount = Math.max(0, targetAmount - reservedAmount)
  const allocationValue = toPositiveNumber(goal.allocationValue)
  const allocationType = normalizeAllocationType(goal.allocationType, allocationValue)
  const monthlyRuleEstimatedAmount = getMonthlyRuleEstimate(allocationType, allocationValue, snapshot)

  return {
    id: goal.id,
    name: goal.title.trim() || 'Planejamento sem nome',
    planningType: normalizePlanningType(goal.planningType),
    targetAmount,
    reservedAmount,
    progressPercentage,
    missingAmount,
    countsAsReserved: goal.countsAsReserved ?? true,
    allocationType,
    allocationValue: allocationType === 'NONE' ? null : allocationValue,
    monthlyRuleEstimatedAmount,
    forecastLabel: getForecastLabel(allocationType, monthlyRuleEstimatedAmount, missingAmount),
    statusLabel: getStatusLabel(goal),
    linkedCategories: Array.isArray(goal.linkedCategories) ? goal.linkedCategories.filter(Boolean) : [],
    isSystem: goal.isSystem,
    sourceGoal: goal
  }
}

const getReservedByTypeKey = (planningType: CashPlanningType): 'goals' | 'reserves' | 'provisions' => {
  if (planningType === 'RESERVE') return 'reserves'
  if (planningType === 'PROVISION') return 'provisions'
  return 'goals'
}

export const getCashPlanningPageData = (
  goals: Goal[],
  snapshot: FinancialSnapshot
): CashPlanningPageData => {
  const normalizedGoals = goals.map((goal) => buildPlanningData(goal, snapshot))
  const plannings = normalizedGoals.filter((planning) => planning.sourceGoal.status === 'active')
  const completedPlannings = normalizedGoals.filter((planning) => planning.sourceGoal.status === 'completed')

  const reservedActive = plannings.reduce((acc, planning) => {
    if (!planning.countsAsReserved) {
      return acc
    }

    return acc + planning.reservedAmount
  }, 0)
  const activeTargetAmount = plannings.reduce((acc, planning) => acc + planning.targetAmount, 0)
  const monthlyRuleTotal = plannings.reduce((acc, planning) => acc + planning.monthlyRuleEstimatedAmount, 0)
  const realFreeCash = toFiniteNumber(snapshot.accountBalance, 0) - reservedActive
  const reservedByType = plannings.reduce(
    (acc, planning) => {
      if (!planning.countsAsReserved) {
        return acc
      }

      acc[getReservedByTypeKey(planning.planningType)] += planning.reservedAmount
      return acc
    },
    { goals: 0, reserves: 0, provisions: 0 }
  )
  const alerts: CashPlanningAlert[] = []
  const withoutReserved = plannings.filter((planning) => planning.targetAmount > 0 && planning.reservedAmount <= 0).length
  const withoutRule = plannings.filter((planning) => planning.allocationType === 'NONE').length
  const withoutForecast = plannings.filter((planning) => planning.targetAmount > 0 && planning.forecastLabel === 'Configure uma regra').length

  if (withoutReserved > 0) {
    alerts.push({
      type: 'warning',
      message: `${withoutReserved} planejamentos ativos ainda não possuem valor reservado.`
    })
  }

  if (withoutRule > 0) {
    alerts.push({
      type: 'info',
      message: `${withoutRule} planejamentos ativos não possuem regra mensal configurada.`
    })
  }

  if (withoutForecast > 0) {
    alerts.push({
      type: 'warning',
      message: 'Existem planejamentos sem previsão. Configure uma regra para calcular o prazo.'
    })
  }

  if (activeTargetAmount > 0 && reservedActive === 0) {
    alerts.push({
      type: 'danger',
      message: `Há ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeTargetAmount)} em alvos ativos, mas nenhum valor reservado ainda.`
    })
  }

  return {
    summary: {
      accountBalance: toFiniteNumber(snapshot.accountBalance, 0),
      reservedActive,
      realFreeCash,
      monthlyRuleTotal,
      activeTargetAmount,
      activePlansCount: plannings.length
    },
    charts: {
      cashComposition: {
        free: Math.max(0, realFreeCash),
        reserved: reservedActive,
        committed: 0
      },
      reservedByType,
      reservedByPlanning: plannings.map((planning) => ({
        id: planning.id,
        name: planning.name,
        reservedAmount: planning.reservedAmount,
        targetAmount: planning.targetAmount,
        progressPercentage: planning.progressPercentage
      }))
    },
    alerts,
    plannings,
    completedPlannings
  }
}
