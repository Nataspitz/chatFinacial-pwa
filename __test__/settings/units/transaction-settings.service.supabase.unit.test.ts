import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseChain } from '../../shared/supabase-chain.mock'

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
  const mod = await import('../../../src/services/transaction-settings.service')
  return mod.transactionSettingsService
}

describe('transactionSettingsService Supabase contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  it('le configuracoes do usuario e normaliza defaults quando nao ha linha', async () => {
    const chain = createSupabaseChain({ data: null, error: null })
    supabaseMock.from.mockReturnValue(chain)
    const service = await loadService()

    const result = await service.getSettings(true)

    expect(supabaseMock.from).toHaveBeenCalledWith('transaction_settings')
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('allow_credit_without_installments'))
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1)
    expect(result.defaultPaymentMethodEntrada).toBe('pix')
    expect(result.enforceConsistency).toBe(true)
  })

  it('salva configuracoes via upsert por user_id e atualiza cache normalizado', async () => {
    const chain = createSupabaseChain({
      data: {
        default_payment_method_entrada: 'debito',
        default_payment_method_saida: 'credito',
        default_confirmed_entrada: false,
        default_confirmed_saida: true,
        default_monthly_cost_saida: true,
        enforce_consistency: false,
        allow_credit_without_installments: true
      },
      error: null
    })
    supabaseMock.from.mockReturnValue(chain)
    const service = await loadService()

    const result = await service.saveSettings({
      defaultPaymentMethodEntrada: 'debito',
      defaultPaymentMethodSaida: 'credito',
      defaultConfirmedEntrada: false,
      defaultConfirmedSaida: true,
      defaultMonthlyCostSaida: true,
      enforceConsistency: false,
      allowCreditWithoutInstallments: true
    })

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        default_payment_method_entrada: 'debito',
        allow_credit_without_installments: true
      }),
      { onConflict: 'user_id' }
    )
    expect(chain.single).toHaveBeenCalledTimes(1)
    expect(result.defaultPaymentMethodSaida).toBe('credito')
  })
})
