import { vi } from 'vitest'
import { DEFAULT_TRANSACTION_SETTINGS } from '../../../src/types/transaction-settings.types'
import type { Transaction } from '../../../src/types/transaction.types'
import type { ReportCategoryMap } from './report-transactions.mock'
import { createReportCategoryMap } from './report-transactions.mock'

interface FinanceMockState {
  transactions: Transaction[]
  categories: ReportCategoryMap
}

const financeState: FinanceMockState = {
  transactions: [],
  categories: createReportCategoryMap()
}

export const financeServiceMock = {
  getTransactions: vi.fn(async () => financeState.transactions),
  getCategoryItems: vi.fn(async (type: keyof ReportCategoryMap) => financeState.categories[type] ?? []),
  saveTransactions: vi.fn(async () => undefined),
  updateTransaction: vi.fn(async () => undefined),
  deleteTransaction: vi.fn(async () => undefined),
  saveCategory: vi.fn(async () => undefined),
  updateCategory: vi.fn(async () => undefined),
  deleteCategory: vi.fn(async () => undefined),
  exportReportPdf: vi.fn(async () => ({
    fileName: 'relatorio-financeiro.pdf',
    filePath: '/tmp/relatorio-financeiro.pdf'
  }))
}

export const setFinanceServiceMockData = (input: Partial<FinanceMockState>): void => {
  if (input.transactions) {
    financeState.transactions = [...input.transactions]
  }

  if (input.categories) {
    financeState.categories = input.categories
  }
}

export const resetFinanceServiceMock = (): void => {
  financeState.transactions = []
  financeState.categories = createReportCategoryMap()
  Object.values(financeServiceMock).forEach((mockFn) => {
    if ('mockClear' in mockFn) {
      mockFn.mockClear()
    }
  })
}

let transactionSettingsState = DEFAULT_TRANSACTION_SETTINGS

export const transactionSettingsServiceMock = {
  getSettings: vi.fn(async () => transactionSettingsState),
  saveSettings: vi.fn(async (settings: typeof DEFAULT_TRANSACTION_SETTINGS) => {
    transactionSettingsState = settings
  }),
  clearCache: vi.fn()
}

export const resetTransactionSettingsServiceMock = (): void => {
  transactionSettingsState = DEFAULT_TRANSACTION_SETTINGS
  Object.values(transactionSettingsServiceMock).forEach((mockFn) => {
    if ('mockClear' in mockFn) {
      mockFn.mockClear()
    }
  })
}
