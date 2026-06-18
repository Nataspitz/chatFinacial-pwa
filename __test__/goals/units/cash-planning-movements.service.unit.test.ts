import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cashPlanningMovementsService } from '../../../src/services/cash-planning-movements.service'
import { goalsService } from '../../../src/services/goals.service'
import type { Goal } from '../../../src/types/goal.types'
import type { Transaction } from '../../../src/types/transaction.types'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: supabaseMock
}))

vi.mock('../../../src/services/goals.service', () => ({
  goalsService: {
    getGoals: vi.fn()
  }
}))

const createMaybeSingleChain = (response: unknown) => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn()
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.maybeSingle.mockResolvedValue(response)
  return chain
}

const createUpdateChain = (response: unknown) => {
  let eqCalls = 0
  const chain = {
    update: vi.fn(),
    eq: vi.fn()
  }
  chain.update.mockReturnValue(chain)
  chain.eq.mockImplementation(() => {
    eqCalls += 1
    return eqCalls >= 2 ? Promise.resolve(response) : chain
  })
  return chain
}

const createSingleEqUpdateChain = (response: unknown) => {
  const chain = {
    update: vi.fn(),
    eq: vi.fn()
  }
  chain.update.mockReturnValue(chain)
  chain.eq.mockResolvedValue(response)
  return chain
}

const createInsertChain = (response: unknown) => ({
  insert: vi.fn().mockResolvedValue(response)
})

const createDeleteChain = (response: unknown) => ({
  delete: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(response)
  })
})

const createExistingMonthlyRulesChain = (response: unknown) => {
  let eqCalls = 0
  const chain = {
    select: vi.fn(),
    eq: vi.fn()
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockImplementation(() => {
    eqCalls += 1
    return eqCalls >= 2 ? Promise.resolve(response) : chain
  })
  return chain
}

const createMonthlyAppliedChain = (response: unknown) => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn()
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.in.mockResolvedValue(response)
  return chain
}

const createAverageRevenueChain = (response: unknown) => {
  const chain = {
    select: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    limit: vi.fn()
  }
  chain.select.mockReturnValue(chain)
  chain.gte.mockReturnValue(chain)
  chain.lt.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.limit.mockResolvedValue(response)
  return chain
}

const baseTransaction: Transaction = {
  id: 'tx-1',
  type: 'saida',
  category: 'Material',
  amount: 300,
  description: 'Compra de telha',
  date: '2026-05-10',
  isConfirmed: true,
  confirmedAt: '2026-05-10T12:00:00.000Z',
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 300,
  isInstallment: false
}

const makeGoal = (goal: Partial<Goal>): Goal => ({
  id: goal.id ?? 'goal-1',
  title: goal.title ?? 'Planejamento',
  targetAmount: goal.targetAmount ?? 1000,
  reservedAmount: goal.reservedAmount ?? 0,
  countsAsReserved: goal.countsAsReserved ?? true,
  planningType: goal.planningType ?? 'goal',
  allocationType: goal.allocationType ?? 'fixed',
  allocationValue: goal.allocationValue ?? 0,
  linkedCategories: goal.linkedCategories ?? [],
  status: goal.status ?? 'active',
  isSystem: goal.isSystem ?? false,
  systemKey: goal.systemKey ?? null
})

describe('cashPlanningMovementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.from.mockReset()
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  it('registra saida confirmada como uso da reparticao e reduz valor reservado', async () => {
    const existingMovementChain = createMaybeSingleChain({ data: null, error: null })
    const goalLookupChain = createMaybeSingleChain({
      data: {
        id: 'goal-1',
        title: 'Construcao do chale',
        reserved_amount: 1000,
        target_amount: 5000,
        status: 'active',
        user_id: 'user-1'
      },
      error: null
    })
    const updateGoalChain = createUpdateChain({ data: null, error: null })
    const insertMovementChain = createInsertChain({ data: null, error: null })

    supabaseMock.from
      .mockReturnValueOnce(existingMovementChain)
      .mockReturnValueOnce(goalLookupChain)
      .mockReturnValueOnce(updateGoalChain)
      .mockReturnValueOnce(insertMovementChain)

    await cashPlanningMovementsService.applyTransactionAllocation({
      transaction: baseTransaction,
      goalId: 'goal-1'
    })

    expect(updateGoalChain.update).toHaveBeenCalledWith({ reserved_amount: 700 })
    expect(insertMovementChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        goal_id: 'goal-1',
        transaction_id: 'tx-1',
        type: 'USED_BY_TRANSACTION',
        amount: 300,
        direction: 'OUT',
        reference_month: '2026-05-01'
      })
    )
  })

  it('registra entrada confirmada como incremento da reparticao manual', async () => {
    const existingMovementChain = createMaybeSingleChain({ data: null, error: null })
    const goalLookupChain = createMaybeSingleChain({
      data: {
        id: 'goal-1',
        title: 'Custos mensais',
        reserved_amount: 200,
        target_amount: 1200,
        status: 'active',
        user_id: 'user-1'
      },
      error: null
    })
    const updateGoalChain = createUpdateChain({ data: null, error: null })
    const insertMovementChain = createInsertChain({ data: null, error: null })

    supabaseMock.from
      .mockReturnValueOnce(existingMovementChain)
      .mockReturnValueOnce(goalLookupChain)
      .mockReturnValueOnce(updateGoalChain)
      .mockReturnValueOnce(insertMovementChain)

    await cashPlanningMovementsService.applyTransactionAllocation({
      transaction: { ...baseTransaction, type: 'entrada', amount: 500 },
      goalId: 'goal-1'
    })

    expect(updateGoalChain.update).toHaveBeenCalledWith({ reserved_amount: 700 })
    expect(insertMovementChain.insert).toHaveBeenCalledWith(expect.objectContaining({ direction: 'IN' }))
  })

  it('remove vinculo existente e devolve o impacto ao reservado', async () => {
    const existingMovementChain = createMaybeSingleChain({
      data: {
        id: 'movement-1',
        goal_id: 'goal-1',
        amount: 300,
        direction: 'OUT'
      },
      error: null
    })
    const goalLookupChain = createMaybeSingleChain({
      data: {
        id: 'goal-1',
        title: 'Construcao do chale',
        reserved_amount: 700,
        target_amount: 5000,
        status: 'active',
        user_id: 'user-1'
      },
      error: null
    })
    const updateGoalChain = createUpdateChain({ data: null, error: null })
    const deleteMovementChain = createDeleteChain({ data: null, error: null })

    supabaseMock.from
      .mockReturnValueOnce(existingMovementChain)
      .mockReturnValueOnce(goalLookupChain)
      .mockReturnValueOnce(updateGoalChain)
      .mockReturnValueOnce(deleteMovementChain)

    await cashPlanningMovementsService.saveTransactionAllocation(baseTransaction, null)

    expect(updateGoalChain.update).toHaveBeenCalledWith({ reserved_amount: 1000 })
    expect(deleteMovementChain.delete).toHaveBeenCalled()
  })

  it('aplica regra percentual em toda entrada confirmada', async () => {
    vi.mocked(goalsService.getGoals).mockResolvedValue([
      makeGoal({
        id: 'goal-percent',
        title: 'Novo quarto',
        targetAmount: 10000,
        reservedAmount: 100,
        allocationType: 'percentage',
        allocationValue: 25
      })
    ])

    const existingRulesChain = createExistingMonthlyRulesChain({ data: [], error: null })
    const monthlyAppliedChain = createMonthlyAppliedChain({ data: [], error: null })
    const averageRevenueChain = createAverageRevenueChain({ data: [], error: null })
    const updateGoalChain = createSingleEqUpdateChain({ data: null, error: null })
    const insertMovementChain = createInsertChain({ data: null, error: null })

    supabaseMock.from
      .mockReturnValueOnce(existingRulesChain)
      .mockReturnValueOnce(monthlyAppliedChain)
      .mockReturnValueOnce(averageRevenueChain)
      .mockReturnValueOnce(updateGoalChain)
      .mockReturnValueOnce(insertMovementChain)

    await cashPlanningMovementsService.applyAutomaticRulesForIncome({
      ...baseTransaction,
      type: 'entrada',
      amount: 1000,
      description: 'Hospedagem'
    })

    expect(updateGoalChain.update).toHaveBeenCalledWith({ reserved_amount: 350 })
    expect(insertMovementChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        goal_id: 'goal-percent',
        type: 'MONTHLY_RULE',
        amount: 250,
        direction: 'IN',
        reference_month: '2026-05-01',
        transaction_id: 'tx-1'
      })
    )
  })

  it('rateia regra fixa pela media mensal e limita ao alvo do mes', async () => {
    vi.mocked(goalsService.getGoals).mockResolvedValue([
      makeGoal({
        id: 'goal-fixed',
        title: 'Conta de luz',
        targetAmount: 1000,
        reservedAmount: 300,
        planningType: 'bill_provision',
        allocationType: 'fixed',
        allocationValue: 170
      })
    ])

    const existingRulesChain = createExistingMonthlyRulesChain({ data: [], error: null })
    const monthlyAppliedChain = createMonthlyAppliedChain({
      data: [{ goal_id: 'goal-fixed', amount: 150 }],
      error: null
    })
    const averageRevenueChain = createAverageRevenueChain({
      data: [{ total_entries: 4000 }],
      error: null
    })
    const updateGoalChain = createSingleEqUpdateChain({ data: null, error: null })
    const insertMovementChain = createInsertChain({ data: null, error: null })

    supabaseMock.from
      .mockReturnValueOnce(existingRulesChain)
      .mockReturnValueOnce(monthlyAppliedChain)
      .mockReturnValueOnce(averageRevenueChain)
      .mockReturnValueOnce(updateGoalChain)
      .mockReturnValueOnce(insertMovementChain)

    await cashPlanningMovementsService.applyAutomaticRulesForIncome({
      ...baseTransaction,
      type: 'entrada',
      amount: 1000,
      description: 'Diaria'
    })

    expect(updateGoalChain.update).toHaveBeenCalledWith({ reserved_amount: 320 })
    expect(insertMovementChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      goal_id: 'goal-fixed',
      type: 'MONTHLY_RULE',
      amount: 20
    }))
  })
})
