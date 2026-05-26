import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../../src/types/transaction.types'
import { getFinancialReportAmount, shouldAffectFinancialReports } from '../../../src/utils/transaction-reports'

const buildTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  type: 'saida',
  category: 'Despesa',
  amount: 300,
  description: 'Compra',
  date: '2026-04-10',
  isConfirmed: true,
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 300,
  isInstallment: false,
  ...overrides
})

describe('transaction report impact', () => {
  it('retorna impacto zero para saida reembolsada sem criar entrada', () => {
    const transactions = [
      buildTransaction({ id: 'refund', status: 'refunded', ignoredInReports: true })
    ]

    const entries = transactions
      .filter((item) => item.type === 'entrada')
      .reduce((total, item) => total + getFinancialReportAmount(item), 0)
    const outcomes = transactions
      .filter((item) => item.type === 'saida')
      .reduce((total, item) => total + getFinancialReportAmount(item), 0)

    expect(entries).toBe(0)
    expect(outcomes).toBe(0)
    expect(entries - outcomes).toBe(0)
    expect(shouldAffectFinancialReports(transactions[0])).toBe(false)
  })

  it('normaliza status legado REIMBURSED e CANCELED como sem impacto', () => {
    expect(shouldAffectFinancialReports(buildTransaction({ status: 'REIMBURSED' }))).toBe(false)
    expect(shouldAffectFinancialReports(buildTransaction({ status: 'CANCELED' }))).toBe(false)
    expect(shouldAffectFinancialReports(buildTransaction({ status: 'active' }))).toBe(true)
  })
})
