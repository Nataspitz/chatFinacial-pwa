import type { BusinessSettings } from '../../../src/services/business.service'
import type { Transaction } from '../../../src/types/transaction.types'

interface BuildTransactionInput extends Partial<Transaction> {
  id: string
  type: Transaction['type']
  amount: number
  date: string
}

export const buildTransaction = (input: BuildTransactionInput): Transaction => {
  return {
    id: input.id,
    type: input.type,
    category: input.category ?? (input.type === 'entrada' ? 'Receita' : 'Despesa'),
    amount: input.amount,
    description: input.description ?? '',
    date: input.date,
    createdAt: input.createdAt,
    isConfirmed: input.isConfirmed ?? true,
    isMonthlyCost: input.isMonthlyCost ?? false,
    paymentMethod: input.paymentMethod ?? 'pix',
    installmentGroupId: input.installmentGroupId ?? null,
    installmentNumber: input.installmentNumber ?? 1,
    installmentCount: input.installmentCount ?? 1,
    totalAmount: input.totalAmount ?? input.amount,
    isInstallment: input.isInstallment ?? false
  }
}

export const dashboardTransactionsFixture: Transaction[] = [
  buildTransaction({
    id: 'dec-2025-entry',
    type: 'entrada',
    amount: 400,
    date: '2025-12-15'
  }),
  buildTransaction({
    id: 'jan-2026-entry',
    type: 'entrada',
    amount: 1000,
    date: '2026-01-10'
  }),
  buildTransaction({
    id: 'feb-2026-expense',
    type: 'saida',
    amount: 200,
    date: '2026-02-10'
  }),
  buildTransaction({
    id: 'mar-2026-monthly-cost',
    type: 'saida',
    amount: 100,
    date: '2026-03-05',
    isMonthlyCost: true
  }),
  buildTransaction({
    id: 'apr-2026-entry-current',
    type: 'entrada',
    amount: 50,
    date: '2026-04-10'
  }),
  buildTransaction({
    id: 'apr-2026-entry-future-day',
    type: 'entrada',
    amount: 700,
    date: '2026-04-20'
  }),
  buildTransaction({
    id: 'may-2026-entry-future-month',
    type: 'entrada',
    amount: 300,
    date: '2026-05-05'
  })
]

export const businessSettingsFixture: BusinessSettings = {
  company_id: 'company-1',
  investment_base_amount: null,
  no_initial_investment: false,
  account_balance_base_amount: 0,
  account_balance_base_date: '2026-01-01',
  account_balance_locked_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
}
