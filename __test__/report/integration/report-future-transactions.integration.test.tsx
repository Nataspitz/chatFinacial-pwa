import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportPage } from '../../../src/pages/Report/components/ReportPage'
import { DEFAULT_TRANSACTION_SETTINGS } from '../../../src/types/transaction-settings.types'
import { createAuthContextMock } from '../../auth/mocks/auth-context.mock'
import { buildTransaction } from '../mocks/transactions.mock'

const getTransactionsMock = vi.fn()
const getCategoryItemsMock = vi.fn()
const useAuthMock = vi.fn()
const getSettingsMock = vi.fn()

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock()
}))

vi.mock('../../../src/services/finance.service', () => ({
  financeService: {
    getTransactions: () => getTransactionsMock(),
    getCategoryItems: (type: 'entrada' | 'saida') => getCategoryItemsMock(type),
    deleteTransaction: vi.fn(async () => undefined),
    updateTransaction: vi.fn(async () => undefined),
    updateMonthlyCostFromDate: vi.fn(async () => undefined),
    endMonthlyCostFromDate: vi.fn(async () => undefined),
    saveTransactions: vi.fn(async () => undefined),
    saveCategory: vi.fn(async () => undefined),
    exportReportToPdf: vi.fn(async () => undefined),
    getUserName: vi.fn(async () => 'Usuario teste'),
    getOrCreateCategoryItem: vi.fn(async () => ({ id: 'cat', type: 'entrada', name: 'Categoria' })),
    createCategoryItem: vi.fn(async () => ({ id: 'cat', type: 'entrada', name: 'Categoria' })),
    updateCategoryItemById: vi.fn(async () => undefined),
    deleteCategoryItemById: vi.fn(async () => undefined)
  }
}))

vi.mock('../../../src/services/transaction-settings.service', () => ({
  transactionSettingsService: {
    getSettings: () => getSettingsMock()
  }
}))

const parseCurrency = (value: string): number => {
  const normalized = value
    .replace(/\u00a0/g, ' ')
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(normalized)
}

const getSectionTotal = (title: string): number => {
  const heading = screen.getByRole('heading', { name: title })
  const toggleButton = heading.closest('button')
  if (!toggleButton) {
    throw new Error(`Botao da secao ${title} nao encontrado`)
  }

  const totalNode = toggleButton.querySelector('strong')
  if (!totalNode || !totalNode.textContent) {
    throw new Error(`Total da secao ${title} nao encontrado`)
  }

  return parseCurrency(totalNode.textContent)
}

describe('Report future transactions integration', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 3, 15))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const toIsoDate = (value: Date): string => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const addDays = (base: Date, days: number): string =>
    toIsoDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days))

  it('separa valores futuros apenas quando ainda nao estao confirmados', async () => {
    const now = new Date()

    useAuthMock.mockReturnValue(createAuthContextMock({ user: { id: 'u-1', email: 'user@test.com' } as never }))
    getSettingsMock.mockResolvedValue(DEFAULT_TRANSACTION_SETTINGS)
    getCategoryItemsMock.mockImplementation(async (type: 'entrada' | 'saida') =>
      type === 'entrada'
        ? [{ id: 'e-1', type: 'entrada', name: 'Vendas' }]
        : [{ id: 's-1', type: 'saida', name: 'Custos' }]
    )
    getTransactionsMock.mockResolvedValue([
      buildTransaction({
        id: 'entrada-atual',
        type: 'entrada',
        amount: 100,
        date: addDays(now, -3),
        description: 'Entrada atual'
      }),
      buildTransaction({
        id: 'entrada-futura',
        type: 'entrada',
        amount: 300,
        date: addDays(now, 3),
        isConfirmed: false,
        description: 'Entrada futura'
      }),
      buildTransaction({
        id: 'saida-atual',
        type: 'saida',
        amount: 50,
        date: addDays(now, -2),
        description: 'Saida atual'
      }),
      buildTransaction({
        id: 'saida-futura',
        type: 'saida',
        amount: 25,
        date: addDays(now, 4),
        isConfirmed: false,
        description: 'Saida futura'
      })
    ])

    render(<ReportPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Entradas' })).toBeInTheDocument()
    })

    expect(getSectionTotal('Entradas')).toBeCloseTo(100)
    expect(getSectionTotal('Saídas')).toBeCloseTo(50)
    expect(getSectionTotal('Entradas futuras')).toBeCloseTo(300)
    expect(getSectionTotal('Saídas futuras')).toBeCloseTo(25)
  })
})
