import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseChain, createThenableSupabaseChain, type SupabaseChainMock } from '../../shared/supabase-chain.mock'
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

const loadService = async () => {
  vi.resetModules()
  const mod = await import('../../../src/services/finance.service')
  return mod.financeService
}

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  type: 'saida',
  category: 'Marketing',
  amount: 120,
  description: 'Anuncio',
  date: '2026-05-10',
  isConfirmed: true,
  confirmedAt: '2026-05-10T10:00:00.000Z',
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 120,
  isInstallment: false,
  monthlyEndDate: null,
  ...overrides
})

describe('financeService Supabase CRUD contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  it('getTransactions consulta apenas transacoes do usuario nao removidas e mapeia linhas', async () => {
    const chain = createThenableSupabaseChain({
      data: [
        {
          id: 'tx-1',
          type: 'entrada',
          category: 'Vendas',
          amount: '250.75',
          description: 'Venda',
          date: '2026-05-02T00:00:00.000Z',
          created_at: '2026-05-02T10:00:00.000Z',
          is_confirmed: true,
          confirmed_at: '2026-05-02T10:00:00.000Z',
          is_monthly_cost: false,
          payment_method: 'pix',
          installment_group_id: null,
          installment_number: 1,
          installment_count: 1,
          total_amount: '250.75',
          is_installment: false,
          monthly_end_date: null,
          status: 'confirmed',
          ignored_in_reports: false,
          deleted_at: null
        }
      ],
      error: null
    })
    supabaseMock.from.mockReturnValue(chain)
    const service = await loadService()

    const result = await service.getTransactions()

    expect(supabaseMock.from).toHaveBeenCalledWith('transactions')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('monthly_end_date'))
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.is).toHaveBeenCalledWith('deleted_at', null)
    expect(chain.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(result[0]).toEqual(expect.objectContaining({ id: 'tx-1', amount: 250.75, date: '2026-05-02' }))
  })

  it('saveTransactions insere payload normalizado com user_id', async () => {
    const chain = createThenableSupabaseChain({ data: null, error: null })
    supabaseMock.from.mockReturnValue(chain)
    const service = await loadService()

    await service.saveTransactions([transaction({ isMonthlyCost: true, monthlyEndDate: '2026-12-31' })])

    expect(supabaseMock.from).toHaveBeenCalledWith('transactions')
    expect(chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'tx-1',
        user_id: 'user-1',
        type: 'saida',
        category: 'Marketing',
        is_monthly_cost: true,
        monthly_end_date: '2026-12-31',
        status: 'confirmed'
      })
    ])
  })

  it('updateTransaction filtra por id e user_id ao alterar uma transacao', async () => {
    const chain = createThenableSupabaseChain({ data: null, error: null })
    supabaseMock.from.mockReturnValue(chain)
    const service = await loadService()

    await service.updateTransaction(transaction({ amount: 180, description: 'Anuncio atualizado' }))

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      amount: 180,
      description: 'Anuncio atualizado',
      category: 'Marketing'
    }))
    expect(chain.eq).toHaveBeenCalledWith('id', 'tx-1')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('deleteTransaction faz soft delete e limita escopo ao usuario', async () => {
    const lookupChain = createSupabaseChain({
      data: {
        installment_group_id: null,
        installment_count: 1,
        date: '2026-05-10'
      },
      error: null
    })
    const deleteChain = createThenableSupabaseChain({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(lookupChain).mockReturnValueOnce(deleteChain)
    const service = await loadService()

    await service.deleteTransaction('tx-1')

    expect(lookupChain.select).toHaveBeenCalledWith('installment_group_id, installment_count, date')
    expect(lookupChain.eq).toHaveBeenCalledWith('id', 'tx-1')
    expect(lookupChain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(deleteChain.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) })
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(deleteChain.is).toHaveBeenCalledWith('deleted_at', null)
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'tx-1')
  })

  it('restoreDeletedTransactionsByIds restaura somente ids do usuario e retorna quantidade', async () => {
    const chain = createSupabaseChain({ data: [{ id: 'tx-1' }, { id: 'tx-2' }], error: null })
    chain.select.mockResolvedValue({ data: [{ id: 'tx-1' }, { id: 'tx-2' }], error: null })
    supabaseMock.from.mockReturnValue(chain)
    const service = await loadService()

    const restored = await service.restoreDeletedTransactionsByIds(['tx-1', 'tx-2'])

    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null })
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.in).toHaveBeenCalledWith('id', ['tx-1', 'tx-2'])
    expect(chain.not).toHaveBeenCalledWith('deleted_at', 'is', null)
    expect(restored).toBe(2)
  })

  it('getCategoryItems garante categoria geral e lista categorias do tipo solicitado', async () => {
    const ensureChain = createThenableSupabaseChain({ data: null, error: null })
    const listChain = createSupabaseChain({
      data: [
        { id: 'cat-1', type: 'saida', name: 'Marketing' }
      ],
      error: null
    })
    listChain.order.mockResolvedValue({ data: [{ id: 'cat-1', type: 'saida', name: 'Marketing' }], error: null })
    supabaseMock.from.mockReturnValueOnce(ensureChain).mockReturnValueOnce(listChain)
    const service = await loadService()

    const result = await service.getCategoryItems('saida')

    expect(ensureChain.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', type: 'saida', name: 'Geral' },
      { onConflict: 'user_id,type,name_normalized', ignoreDuplicates: true }
    )
    expect(listChain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(listChain.eq).toHaveBeenCalledWith('type', 'saida')
    expect(result.map((item) => item.name)).toContain('Marketing')
  })

  it('updateCategory bloqueia edicao da categoria Geral', async () => {
    const currentChain = createSupabaseChain({ data: { name: 'Geral' }, error: null })
    supabaseMock.from.mockReturnValue(currentChain)
    const service = await loadService()

    await expect(service.updateCategory('cat-general', 'Outro', 'saida')).rejects.toThrow('A categoria Geral')

    expect(currentChain.select).toHaveBeenCalledWith('name')
    expect(currentChain.eq).toHaveBeenCalledWith('id', 'cat-general')
    expect(currentChain.update).not.toHaveBeenCalled()
  })
})
