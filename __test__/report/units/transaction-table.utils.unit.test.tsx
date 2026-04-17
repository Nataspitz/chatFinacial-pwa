import { describe, expect, it, vi } from 'vitest'
import { formatPaymentMethod, getCategorySelectOptions, getConfirmedValue, getMonthlyCostValue } from '../../../src/pages/Report/components/transactionTable.utils'
import type { Transaction } from '../../../src/types/transaction.types'

const baseTransaction: Transaction = {
  id: 'tx-1',
  type: 'saida',
  category: 'Operacional',
  amount: 100,
  description: 'Despesa',
  date: '2026-04-17',
  isConfirmed: true,
  isMonthlyCost: true,
  paymentMethod: 'pix',
  installmentGroupId: null,
  installmentNumber: 1,
  installmentCount: 1,
  totalAmount: 100,
  isInstallment: false
}

describe('transactionTable.utils', () => {
  it('mantem categoria atual no topo se nao existir na lista', () => {
    const options = getCategorySelectOptions(['Aluguel', 'Software'], ' Operacional ')
    expect(options[0]).toBe('Operacional')
    expect(options).toContain('Aluguel')
  })

  it('formata metodo de pagamento em texto amigavel', () => {
    expect(formatPaymentMethod('credito')).toBe('Credito')
    expect(formatPaymentMethod('debito')).toBe('Debito')
    expect(formatPaymentMethod('dinheiro')).toBe('Dinheiro')
    expect(formatPaymentMethod('pix')).toBe('Pix')
  })

  it('retorna valores textuais fora do modo de edicao', () => {
    expect(getMonthlyCostValue(null, false, vi.fn(), baseTransaction)).toBe('Sim')
    expect(getConfirmedValue(null, false, vi.fn(), baseTransaction)).toBe('Sim')
  })
})
