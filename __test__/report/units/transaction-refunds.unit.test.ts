import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../../src/types/transaction.types'
import { getRefundTransactionTargets } from '../../../src/utils/transaction-refunds'

const buildInstallment = (id: string, date: string, groupId = 'group-1'): Transaction => ({
  id,
  type: 'saida',
  category: 'Despesa',
  amount: 100,
  description: id,
  date,
  isConfirmed: true,
  isMonthlyCost: false,
  paymentMethod: 'credito',
  installmentGroupId: groupId,
  installmentNumber: Number(id.replace('p', '')),
  installmentCount: 3,
  totalAmount: 300,
  isInstallment: true
})

describe('getRefundTransactionTargets', () => {
  const installments = [
    buildInstallment('p1', '2026-04-10'),
    buildInstallment('p2', '2026-05-10'),
    buildInstallment('p3', '2026-06-10'),
    buildInstallment('p1-other', '2026-05-10', 'group-2')
  ]

  it('scope single altera so a parcela selecionada', () => {
    expect(getRefundTransactionTargets(installments, installments[1], 'single').map((item) => item.id)).toEqual(['p2'])
  })

  it('scope future altera a selecionada e futuras do mesmo grupo', () => {
    expect(getRefundTransactionTargets(installments, installments[1], 'future').map((item) => item.id)).toEqual(['p2', 'p3'])
  })

  it('scope group altera todas as parcelas do mesmo grupo', () => {
    expect(getRefundTransactionTargets(installments, installments[1], 'group').map((item) => item.id)).toEqual(['p1', 'p2', 'p3'])
  })
})
