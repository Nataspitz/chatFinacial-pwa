import { describe, expect, it } from 'vitest'
import { getCashPlanningPageData } from '../../../src/pages/Goals/services/cashPlanningPageData'
import type { Goal } from '../../../src/types/goal.types'

const makeGoal = (goal: Partial<Goal>): Goal => ({
  id: goal.id ?? 'goal-1',
  title: goal.title ?? 'Planejamento',
  targetAmount: goal.targetAmount ?? 0,
  planningType: goal.planningType ?? 'goal',
  reservedAmount: goal.reservedAmount ?? 0,
  countsAsReserved: goal.countsAsReserved ?? true,
  allocationType: goal.allocationType ?? 'fixed',
  allocationValue: goal.allocationValue ?? 0,
  linkedCategories: goal.linkedCategories ?? [],
  status: goal.status ?? 'active',
  isSystem: goal.isSystem ?? false,
  systemKey: goal.systemKey ?? null
})

describe('getCashPlanningPageData', () => {
  it('centraliza resumo, graficos e alertas da reparticao de caixa', () => {
    const data = getCashPlanningPageData(
      [
        makeGoal({
          id: 'quartinho',
          title: 'Construção do quartinho',
          targetAmount: 18000,
          reservedAmount: 500,
          planningType: 'goal',
          allocationType: 'fixed',
          allocationValue: 500,
          linkedCategories: ['Material']
        }),
        makeGoal({
          id: 'manutencao',
          title: 'Funcionamento Chalé Vermelho',
          targetAmount: 3000,
          reservedAmount: 900,
          planningType: 'reserve',
          allocationType: 'percentage',
          allocationValue: 10
        }),
        makeGoal({
          id: 'sem-regra',
          title: 'Luz e água',
          targetAmount: 600,
          reservedAmount: 0,
          planningType: 'bill_provision',
          allocationValue: 0
        })
      ],
      {
        accountBalance: 5000,
        averageMonthlyEntries: 8000,
        averageMonthlyOutcomes: 4200,
        averageMonthlyResult: 3800
      }
    )

    expect(data.summary).toEqual({
      accountBalance: 5000,
      reservedActive: 1400,
      realFreeCash: 3600,
      monthlyRuleTotal: 1300,
      activeTargetAmount: 21600,
      activePlansCount: 3
    })
    expect(data.charts.cashComposition).toEqual({
      free: 3600,
      reserved: 1400,
      committed: 0
    })
    expect(data.charts.reservedByType).toEqual({
      goals: 500,
      reserves: 900,
      provisions: 0
    })
    expect(data.charts.cashByPlanning).toEqual([
      {
        id: 'quartinho',
        name: 'Construção do quartinho',
        amount: 500,
        percentageOfAccount: 10
      },
      {
        id: 'manutencao',
        name: 'Funcionamento Chalé Vermelho',
        amount: 900,
        percentageOfAccount: 18
      },
      {
        id: 'free-cash',
        name: 'Caixa livre',
        amount: 3600,
        percentageOfAccount: 72
      }
    ])
    expect(data.plannings[0]).toEqual(
      expect.objectContaining({
        name: 'Construção do quartinho',
        progressPercentage: expect.closeTo(2.777, 2),
        missingAmount: 17500,
        forecastLabel: '35 meses'
      })
    )
    expect(data.alerts.map((alert) => alert.message)).toContain(
      '1 planejamentos ativos não possuem regra mensal configurada.'
    )
  })
})
