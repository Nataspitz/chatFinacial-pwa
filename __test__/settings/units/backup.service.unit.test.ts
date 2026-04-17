import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backupService } from '../../../src/services/backup.service'
import { businessService } from '../../../src/services/business.service'
import { financeService } from '../../../src/services/finance.service'
import { transactionSettingsService } from '../../../src/services/transaction-settings.service'
import { DEFAULT_TRANSACTION_SETTINGS } from '../../../src/types/transaction-settings.types'
import type { Transaction } from '../../../src/types/transaction.types'

vi.mock('../../../src/services/finance.service', () => ({
  financeService: {
    getTransactions: vi.fn(),
    saveCategory: vi.fn(),
    saveTransactions: vi.fn()
  }
}))

vi.mock('../../../src/services/transaction-settings.service', () => ({
  transactionSettingsService: {
    saveSettings: vi.fn()
  }
}))

vi.mock('../../../src/services/business.service', () => ({
  businessService: {
    updateBusinessSettings: vi.fn()
  }
}))

const sampleTransaction: Transaction = {
  id: 'tx-1',
  type: 'entrada',
  category: 'Vendas',
  amount: 100,
  description: 'Venda',
  date: '2026-04-01',
  isConfirmed: true,
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 100,
  isInstallment: false
}

describe('backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(financeService.getTransactions).mockResolvedValue([])
    vi.mocked(financeService.saveCategory).mockResolvedValue(undefined)
    vi.mocked(financeService.saveTransactions).mockResolvedValue(undefined)
    vi.mocked(transactionSettingsService.saveSettings).mockResolvedValue(DEFAULT_TRANSACTION_SETTINGS)
    vi.mocked(businessService.updateBusinessSettings).mockResolvedValue({
      company_id: 'user-1',
      investment_base_amount: 1000,
      no_initial_investment: false,
      account_balance_base_amount: 1000,
      account_balance_base_date: '2026-04-01',
      account_balance_locked_at: null,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z'
    })
  })

  it('gera backup incluindo settings opcionais', () => {
    const payload = backupService.buildBackup({
      categories: [{ id: 'cat-1', type: 'entrada', name: 'Vendas' }],
      transactions: [sampleTransaction],
      transactionSettings: DEFAULT_TRANSACTION_SETTINGS,
      businessSettings: {
        investmentBaseAmount: 1000,
        noInitialInvestment: false,
        accountBalanceBaseAmount: 1000,
        accountBalanceBaseDate: '2026-04-01',
        accountBalanceLockedAt: null
      }
    })

    expect(payload.version).toBe(1)
    expect(payload.source).toBe('chatfinacial-pwa')
    expect(payload.transactionSettings).toEqual(DEFAULT_TRANSACTION_SETTINGS)
    expect(payload.businessSettings?.accountBalanceBaseAmount).toBe(1000)
  })

  it('restaura backup legado sem campos novos e aplica defaults', async () => {
    const legacyBackup = JSON.stringify({
      version: 1,
      exportedAt: '2026-04-17T00:00:00.000Z',
      source: 'chatfinacial-pwa',
      categories: [{ type: 'entrada', name: '  Vendas  ' }],
      transactions: [
        {
          id: 'tx-legacy',
          type: 'entrada',
          category: '  Vendas ',
          amount: 350,
          description: 'Recebimento',
          date: '2000-01-01'
        }
      ]
    })

    const result = await backupService.restoreBackup(legacyBackup)

    expect(financeService.saveCategory).toHaveBeenCalledWith('Vendas', 'entrada')
    expect(financeService.saveTransactions).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'tx-legacy',
        paymentMethod: 'pix',
        installmentCount: 1,
        installmentNumber: 1,
        isInstallment: false,
        totalAmount: 350,
        isConfirmed: true
      })
    ])
    expect(result).toEqual({
      importedTransactions: 1,
      restoredTransactionSettings: false,
      restoredBusinessSettings: false,
      warnings: []
    })
  })

  it('restaura transaction settings e business settings quando presentes', async () => {
    const backupWithSettings = JSON.stringify({
      version: 1,
      exportedAt: '2026-04-17T00:00:00.000Z',
      source: 'chatfinacial-pwa',
      categories: [{ id: 'cat-1', type: 'entrada', name: 'Vendas' }],
      transactions: [sampleTransaction],
      transactionSettings: {
        ...DEFAULT_TRANSACTION_SETTINGS,
        defaultPaymentMethodSaida: 'credito'
      },
      businessSettings: {
        investmentBaseAmount: 1500,
        noInitialInvestment: true,
        accountBalanceBaseAmount: 2100,
        accountBalanceBaseDate: '2026-04-01',
        accountBalanceLockedAt: null
      }
    })

    const result = await backupService.restoreBackup(backupWithSettings)

    expect(transactionSettingsService.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPaymentMethodSaida: 'credito'
      })
    )
    expect(businessService.updateBusinessSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        investment_base_amount: 1500,
        no_initial_investment: true,
        account_balance_base_amount: 2100
      })
    )
    expect(result.restoredTransactionSettings).toBe(true)
    expect(result.restoredBusinessSettings).toBe(true)
  })

  it('retorna erro quando json e invalido', async () => {
    await expect(backupService.restoreBackup('{invalid-json')).rejects.toThrow('Arquivo de backup invalido.')
  })
})
