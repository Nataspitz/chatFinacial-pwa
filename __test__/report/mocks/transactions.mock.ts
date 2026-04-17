import type { Transaction } from '../../../src/types/transaction.types'

export const buildTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: overrides.id ?? crypto.randomUUID(),
  type: overrides.type ?? 'entrada',
  category: overrides.category ?? 'Categoria',
  amount: overrides.amount ?? 0,
  description: overrides.description ?? 'Descricao',
  date: overrides.date ?? '2026-04-01',
  isConfirmed: overrides.isConfirmed ?? true,
  isMonthlyCost: overrides.isMonthlyCost ?? false,
  paymentMethod: overrides.paymentMethod ?? 'pix',
  installmentGroupId: overrides.installmentGroupId ?? null,
  installmentNumber: overrides.installmentNumber ?? 1,
  installmentCount: overrides.installmentCount ?? 1,
  totalAmount: overrides.totalAmount ?? overrides.amount ?? 0,
  isInstallment: overrides.isInstallment ?? false
})
