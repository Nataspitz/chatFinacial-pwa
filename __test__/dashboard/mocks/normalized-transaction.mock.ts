import type { NormalizedTransaction } from '../../../src/pages/Dashboard/types'
import type { Transaction } from '../../../src/types/transaction.types'

export const buildNormalizedTransaction = (
  date: string,
  overrides: Partial<Transaction> = {}
): NormalizedTransaction => {
  const parsedDate = new Date(date)
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: overrides.type ?? 'entrada',
    category: overrides.category ?? 'Categoria',
    amount: overrides.amount ?? 0,
    description: overrides.description ?? 'Descricao',
    date,
    isConfirmed: overrides.isConfirmed ?? true,
    isMonthlyCost: overrides.isMonthlyCost ?? false,
    paymentMethod: overrides.paymentMethod ?? 'pix',
    installmentGroupId: overrides.installmentGroupId ?? null,
    installmentNumber: overrides.installmentNumber ?? 1,
    installmentCount: overrides.installmentCount ?? 1,
    totalAmount: overrides.totalAmount ?? overrides.amount ?? 0,
    isInstallment: overrides.isInstallment ?? false,
    parsedDate,
    year: parsedDate.getFullYear(),
    month: parsedDate.getMonth() + 1,
    day: parsedDate.getDate()
  }
}
