import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../../../src/types/transaction.types'

const financeServiceMock = vi.hoisted(() => ({
  getTransactions: vi.fn<() => Promise<Transaction[]>>()
}))

const financialAuditServiceMock = vi.hoisted(() => ({
  getHistory: vi.fn<() => Promise<unknown[]>>()
}))

vi.mock('../../../src/services/finance.service', () => ({
  financeService: financeServiceMock
}))

vi.mock('../../../src/services/financial-audit.service', () => ({
  financialAuditService: financialAuditServiceMock
}))

const buildTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  type: 'saida',
  category: 'Despesa',
  amount: 100,
  description: 'Pagamento',
  date: '2026-05-25',
  isConfirmed: false,
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 100,
  isInstallment: false,
  ...overrides
})

describe('financialNotificationsService refund/cancel filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25))
    financeServiceMock.getTransactions.mockReset()
    financialAuditServiceMock.getHistory.mockReset()
    financialAuditServiceMock.getHistory.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ignora transacoes reembolsadas e anuladas em pendencias', async () => {
    const { financialNotificationsService } = await import('../../../src/services/financial-notifications.service')
    financeServiceMock.getTransactions.mockResolvedValue([
      buildTransaction({ id: 'refunded', status: 'refunded', ignoredInReports: true }),
      buildTransaction({ id: 'canceled', status: 'canceled', ignoredInReports: true }),
      buildTransaction({ id: 'active' })
    ])

    const notifications = await financialNotificationsService.getFinancialNotifications()

    expect(notifications.flatMap((item) => item.transactionIds)).toEqual(['active'])
  })
})
