import { describe, expect, it } from 'vitest'
import { extractEntities, getMissingSlots } from '../../../src/features/chat/assistant'

describe('slot filling', () => {
  it('pede período para listar transações', () => {
    expect(getMissingSlots('list_transactions', extractEntities('quero listar transações', 'list_transactions'))).toEqual(['period'])
  })

  it('pede período para resumo', () => {
    expect(getMissingSlots('show_summary', extractEntities('quero ver resumo', 'show_summary'))).toEqual(['period'])
  })

  it('pede valor quando criação não tem valor', () => {
    expect(getMissingSlots('create_transaction', extractEntities('gastei no mercado', 'create_transaction'))[0]).toBe('amount')
  })

  it('pede descrição ou data depois de receber valor e tipo', () => {
    expect(getMissingSlots('create_transaction', extractEntities('gastei 50', 'create_transaction'))).toContain('description')
  })
})
