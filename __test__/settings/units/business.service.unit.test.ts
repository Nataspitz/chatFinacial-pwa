import { beforeEach, describe, expect, it, vi } from 'vitest'

const getUserMock = vi.fn()
const maybeSingleMock = vi.fn()
const singleMock = vi.fn()
const eqMock = vi.fn()
const selectFromTableMock = vi.fn()
const selectFromWriteMock = vi.fn()
const insertMock = vi.fn()
const upsertMock = vi.fn()
const fromMock = vi.fn()

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => getUserMock()
    },
    from: (table: string) => fromMock(table)
  }
}))

const missingColumnError = (column: string): { message: string } => ({
  message: `column "${column}" does not exist`
})

const loadBusinessService = async () => {
  vi.resetModules()
  const mod = await import('../../../src/services/business.service')
  return mod.businessService
}

describe('businessService schema fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock })
    selectFromTableMock.mockReturnValue({ eq: eqMock })
    selectFromWriteMock.mockReturnValue({ single: singleMock })
    insertMock.mockReturnValue({ select: selectFromWriteMock })
    upsertMock.mockReturnValue({ select: selectFromWriteMock })
    fromMock.mockReturnValue({
      select: selectFromTableMock,
      insert: insertMock,
      upsert: upsertMock
    })

    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1'
        }
      },
      error: null
    })
  })

  it('getBusinessSettings remove coluna ausente e normaliza defaults', async () => {
    const businessService = await loadBusinessService()

    maybeSingleMock
      .mockResolvedValueOnce({
        data: null,
        error: missingColumnError('account_balance_base_amount')
      })
      .mockResolvedValueOnce({
        data: {
          company_id: 'user-1',
          investment_base_amount: 1200,
          no_initial_investment: false,
          created_at: '2026-04-17T00:00:00.000Z',
          updated_at: '2026-04-17T00:00:00.000Z'
        },
        error: null
      })

    const result = await businessService.getBusinessSettings()

    expect(maybeSingleMock).toHaveBeenCalledTimes(2)
    expect(selectFromTableMock.mock.calls[0]?.[0]).toContain('account_balance_base_amount')
    expect(selectFromTableMock.mock.calls[1]?.[0]).not.toContain('account_balance_base_amount')
    expect(result.company_id).toBe('user-1')
    expect(result.investment_base_amount).toBe(1200)
    expect(result.account_balance_base_amount).toBe(0)
  })

  it('updateBusinessSettings reexecuta upsert quando coluna nao existe', async () => {
    const businessService = await loadBusinessService()

    singleMock
      .mockResolvedValueOnce({
        data: null,
        error: missingColumnError('account_balance_base_amount')
      })
      .mockResolvedValueOnce({
        data: {
          company_id: 'user-1',
          investment_base_amount: 950,
          no_initial_investment: false,
          created_at: '2026-04-17T00:00:00.000Z',
          updated_at: '2026-04-17T00:00:00.000Z'
        },
        error: null
      })

    const result = await businessService.updateBusinessSettings({
      investment_base_amount: 950,
      no_initial_investment: false,
      account_balance_base_amount: 500
    })

    expect(upsertMock).toHaveBeenCalledTimes(2)
    expect(selectFromWriteMock.mock.calls[0]?.[0]).toContain('account_balance_base_amount')
    expect(selectFromWriteMock.mock.calls[1]?.[0]).not.toContain('account_balance_base_amount')
    expect(result.investment_base_amount).toBe(950)
    expect(result.account_balance_base_amount).toBe(0)
  })
})
