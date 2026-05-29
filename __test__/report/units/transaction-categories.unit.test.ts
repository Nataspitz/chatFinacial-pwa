import { describe, expect, it } from 'vitest'
import {
  ensureGeneralCategoryOption,
  isGeneralTransactionCategory,
  resolveTransactionCategory
} from '../../../src/utils/transaction-categories'

describe('transaction categories', () => {
  it('resolve categoria vazia como Geral', () => {
    expect(resolveTransactionCategory('')).toBe('Geral')
    expect(resolveTransactionCategory('   ')).toBe('Geral')
    expect(resolveTransactionCategory(' Mercado  mensal ')).toBe('Mercado mensal')
  })

  it('mantem Geral no topo das opcoes de categoria', () => {
    const options = ensureGeneralCategoryOption(
      [
        { id: 'cat-2', type: 'saida' as const, name: 'Fornecedor' },
        { id: 'cat-1', type: 'saida' as const, name: 'Aluguel' }
      ],
      'saida'
    )

    expect(options.map((item) => item.name)).toEqual(['Geral', 'Aluguel', 'Fornecedor'])
    expect(isGeneralTransactionCategory(options[0].name)).toBe(true)
  })
})
