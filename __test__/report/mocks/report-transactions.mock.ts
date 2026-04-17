import type { CategoryItem } from '../../../src/services/finance.service'
import type { PaymentMethod, Transaction, TransactionType } from '../../../src/types/transaction.types'

interface CreateTransactionInput extends Partial<Transaction> {
  id: string
  type?: TransactionType
  amount?: number
  date?: string
}

const DEFAULT_DATE = '2026-04-10'

export const createReportTransaction = ({
  id,
  type = 'entrada',
  amount = 100,
  date = DEFAULT_DATE,
  ...overrides
}: CreateTransactionInput): Transaction => {
  const paymentMethod: PaymentMethod = overrides.paymentMethod ?? 'pix'
  const installmentCount = overrides.installmentCount ?? 1
  const installmentNumber = overrides.installmentNumber ?? 1

  return {
    id,
    type,
    category: overrides.category ?? (type === 'entrada' ? 'Receita' : 'Despesa'),
    amount,
    description: overrides.description ?? `Transacao ${id}`,
    date,
    createdAt: overrides.createdAt ?? `${date}T10:00:00.000Z`,
    isConfirmed: overrides.isConfirmed ?? true,
    isMonthlyCost: overrides.isMonthlyCost ?? false,
    paymentMethod,
    installmentGroupId: overrides.installmentGroupId ?? null,
    installmentNumber,
    installmentCount,
    totalAmount: overrides.totalAmount ?? amount,
    isInstallment: overrides.isInstallment ?? installmentCount > 1,
    ...overrides
  }
}

export interface ReportCategoryMap {
  entrada: CategoryItem[]
  saida: CategoryItem[]
}

export const createReportCategoryMap = (
  overrides: Partial<ReportCategoryMap> = {}
): ReportCategoryMap => ({
  entrada: [
    {
      id: 'cat-entrada-1',
      type: 'entrada',
      name: 'Receita'
    }
  ],
  saida: [
    {
      id: 'cat-saida-1',
      type: 'saida',
      name: 'Despesa'
    }
  ],
  ...overrides
})
