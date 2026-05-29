import { beforeEach, describe, expect, it, vi } from 'vitest'
import { goalsService } from '../../../src/services/goals.service'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: supabaseMock
}))

const createSelectChain = (response: unknown) => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn()
  }

  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValueOnce(chain).mockResolvedValueOnce(response)

  return chain
}

describe('goalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  it('usa a leitura legada quando o Supabase ainda não tem as colunas de planejamento', async () => {
    const newSchemaChain = createSelectChain({
      data: null,
      error: {
        code: '42703',
        message: 'column goals.planning_type does not exist'
      }
    })
    const legacySchemaChain = createSelectChain({
      data: [
        {
          id: 'goal-1',
          title: 'Novo quarto',
          target_amount: 30000,
          status: 'active',
          is_system: false,
          system_key: null,
          created_at: '2026-05-01T00:00:00.000Z',
          updated_at: '2026-05-01T00:00:00.000Z'
        }
      ],
      error: null
    })

    supabaseMock.from.mockReturnValueOnce(newSchemaChain).mockReturnValueOnce(legacySchemaChain)

    const goals = await goalsService.getGoals()

    expect(newSchemaChain.select).toHaveBeenCalledWith(expect.stringContaining('planning_type'))
    expect(legacySchemaChain.select).toHaveBeenCalledWith(expect.not.stringContaining('planning_type'))
    expect(goals).toEqual([
      expect.objectContaining({
        id: 'goal-1',
        title: 'Novo quarto',
        planningType: 'goal',
        reservedAmount: 0,
        countsAsReserved: true,
        allocationType: 'fixed',
        allocationValue: 0,
        linkedCategories: []
      })
    ])
  })
})
