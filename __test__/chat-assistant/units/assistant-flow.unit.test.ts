import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleChatMessage } from '../../../src/features/chat/assistant'
import type { AssistantChatSessionState } from '../../../src/features/chat/assistant'
import { financeService } from '../../../src/services/finance.service'
import type { Transaction } from '../../../src/types/transaction.types'

vi.mock('../../../src/services/finance.service', () => ({
  financeService: {
    getTransactions: vi.fn(),
    saveCategory: vi.fn(),
    saveTransactions: vi.fn()
  }
}))

const referenceDate = new Date(2026, 4, 12)

const transactionsFixture: Transaction[] = [
  {
    id: 'tx-1',
    type: 'saida',
    category: 'Internet',
    amount: 70,
    description: 'internet casa',
    date: '2026-05-10',
    isConfirmed: true,
    isMonthlyCost: false,
    paymentMethod: 'pix',
    installmentGroupId: null,
    installmentNumber: 1,
    installmentCount: 1,
    totalAmount: 70,
    isInstallment: false
  },
  {
    id: 'tx-2',
    type: 'saida',
    category: 'Mercado',
    amount: 90,
    description: 'mercado',
    date: '2026-05-12',
    isConfirmed: true,
    isMonthlyCost: false,
    paymentMethod: 'pix',
    installmentGroupId: null,
    installmentNumber: 1,
    installmentCount: 1,
    totalAmount: 90,
    isInstallment: false
  }
]

describe('assistant flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(financeService.getTransactions).mockResolvedValue(transactionsFixture)
    vi.mocked(financeService.saveCategory).mockResolvedValue(undefined)
    vi.mocked(financeService.saveTransactions).mockResolvedValue(undefined)
  })

  it('pede periodo quando falta em listagem e continua no turno seguinte', async () => {
    const first = await handleChatMessage({
      userId: 'user-1',
      message: 'quero listar transacoes',
      session: null,
      referenceDate
    })

    expect(first.response.type).toBe('question')

    const second = await handleChatMessage({
      userId: 'user-1',
      message: 'maio de 2026',
      session: first.session,
      referenceDate
    })

    expect(second.response.type).toBe('transactions_list')
    if (second.response.type === 'transactions_list') {
      expect(second.response.period?.start).toBe('2026-05-01')
      expect(second.response.period?.end).toBe('2026-05-31')
    }
  })

  it('usa contexto para "so as de internet"', async () => {
    const start = await handleChatMessage({
      userId: 'user-1',
      message: 'listar transacoes de maio de 2026',
      session: null,
      referenceDate
    })

    const follow = await handleChatMessage({
      userId: 'user-1',
      message: 'so as de internet',
      session: start.session,
      referenceDate
    })

    expect(follow.response.type).toBe('transactions_list')
    if (follow.response.type === 'transactions_list') {
      expect(follow.response.data).toHaveLength(1)
      expect(follow.response.data[0].category).toBe('Internet')
    }
  })

  it('aplica contexto anterior quando usuario diz "dia 12"', async () => {
    const start = await handleChatMessage({
      userId: 'user-1',
      message: 'listar transacoes de maio de 2026',
      session: null,
      referenceDate
    })

    const follow = await handleChatMessage({
      userId: 'user-1',
      message: 'dia 12',
      session: start.session,
      referenceDate
    })

    expect(follow.response.type).toBe('transactions_list')
    if (follow.response.type === 'transactions_list') {
      expect(follow.response.period?.start).toBe('2026-05-12')
      expect(follow.response.period?.end).toBe('2026-05-12')
    }
  })

  it('gera draft e confirma criacao', async () => {
    const draftResult = await handleChatMessage({
      userId: 'user-1',
      message: 'gastei 50 no mercado ontem',
      session: null,
      referenceDate
    })

    expect(draftResult.response.type).toBe('transaction_draft')

    const confirmed = await handleChatMessage({
      userId: 'user-1',
      message: 'confirmar',
      session: draftResult.session as AssistantChatSessionState,
      referenceDate
    })

    expect(vi.mocked(financeService.saveTransactions)).toHaveBeenCalledTimes(1)
    expect(confirmed.response.type).toBe('text')
  })

  it('cancela draft sem salvar transacao', async () => {
    const draftResult = await handleChatMessage({
      userId: 'user-1',
      message: 'recebi 500 de salario hoje',
      session: null,
      referenceDate
    })

    expect(draftResult.response.type).toBe('transaction_draft')

    const cancelled = await handleChatMessage({
      userId: 'user-1',
      message: 'cancelar',
      session: draftResult.session as AssistantChatSessionState,
      referenceDate
    })

    expect(vi.mocked(financeService.saveTransactions)).not.toHaveBeenCalled()
    expect(cancelled.response.message.toLowerCase()).toContain('cancelada')
  })

  it('retorna fallback util para texto desconhecido', async () => {
    const response = await handleChatMessage({
      userId: 'user-1',
      message: 'asdf qualquer coisa nada a ver',
      session: null,
      referenceDate
    })

    expect(response.response.type).toBe('text')
    expect(response.response.message.toLowerCase()).toContain('posso te ajudar')
  })
})
