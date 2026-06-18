import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createThenableSupabaseChain } from '../../shared/supabase-chain.mock'

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn()
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: supabaseMock
}))

describe('financialSummaryService Supabase contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista resumos anuais filtrando o intervalo de meses no Supabase', async () => {
    const chain = createThenableSupabaseChain({
      data: [
        {
          id: 'summary-1',
          user_id: 'user-1',
          month_ref: '2026-01-01T00:00:00.000Z',
          total_entries: '1000.50',
          total_outcomes: 300,
          result_balance: '700.50',
          account_balance: '1700.50',
          calculated_at: '2026-01-31T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-31T00:00:00.000Z'
        }
      ],
      error: null
    })
    supabaseMock.from.mockReturnValue(chain)
    const { financialSummaryService } = await import('../../../src/services/financial-summary.service')

    const result = await financialSummaryService.listYear(2026)

    expect(supabaseMock.from).toHaveBeenCalledWith('financial_monthly_summaries')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.gte).toHaveBeenCalledWith('month_ref', '2026-01-01')
    expect(chain.lte).toHaveBeenCalledWith('month_ref', '2026-12-01')
    expect(chain.order).toHaveBeenCalledWith('month_ref', { ascending: true })
    expect(result[0]).toEqual(expect.objectContaining({ monthRef: '2026-01-01', totalEntries: 1000.5 }))
  })

  it('atualiza resumos anuais via rpc e mapeia valores numericos', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          id: 'summary-2',
          user_id: 'user-1',
          month_ref: '2026-02-01',
          total_entries: '200',
          total_outcomes: '50',
          result_balance: '150',
          account_balance: '1850',
          calculated_at: '2026-02-28T00:00:00.000Z',
          created_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-28T00:00:00.000Z'
        }
      ],
      error: null
    })
    const { financialSummaryService } = await import('../../../src/services/financial-summary.service')

    const result = await financialSummaryService.refreshYear(2026)

    expect(supabaseMock.rpc).toHaveBeenCalledWith('refresh_financial_monthly_summaries', { p_year: 2026 })
    expect(result[0]?.resultBalance).toBe(150)
  })
})
