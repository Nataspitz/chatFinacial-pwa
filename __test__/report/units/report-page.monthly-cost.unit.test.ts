import { describe, expect, it } from 'vitest'
import { buildMonthlyCostForPeriod } from '../../../src/pages/Report/components/report-page.monthly-cost'
import type { Transaction } from '../../../src/types/transaction.types'

const monthlyCost: Transaction = {
  id: 'monthly-cost',
  type: 'saida',
  category: 'Aluguel',
  amount: 1200,
  description: 'Aluguel',
  date: '2026-04-10',
  isConfirmed: true,
  isMonthlyCost: true,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 1200,
  isInstallment: false
}

describe('buildMonthlyCostForPeriod', () => {
  it('gera ocorrencia mensal aberta com data de origem para permitir split futuro', () => {
    const occurrence = buildMonthlyCostForPeriod(monthlyCost, '2026', '05', 'all')

    expect(occurrence).toMatchObject({
      id: 'monthly-cost',
      date: '2026-05-10',
      monthlyCostStartDate: '2026-04-10'
    })
  })

  it('nao gera ocorrencias depois do fim da mensalidade', () => {
    const occurrence = buildMonthlyCostForPeriod(
      {
        ...monthlyCost,
        monthlyEndDate: '2026-04-30'
      },
      '2026',
      '05',
      'all'
    )

    expect(occurrence).toBeNull()
  })
})
