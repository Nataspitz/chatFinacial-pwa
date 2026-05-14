import { describe, expect, it } from 'vitest'
import { extractEntities, getMissingSlots } from '../../../src/features/chat/assistant'

describe('slot filling', () => {
  it('na criacao pede valor quando nao informado', () => {
    const slots = extractEntities('gastei no mercado', 'create_transaction', new Date(2026, 4, 12))
    expect(getMissingSlots('create_transaction', slots)[0]).toBe('amount')
  })

  it('na criacao com valor pede descricao e data', () => {
    const slots = extractEntities('gastei 50', 'create_transaction', new Date(2026, 4, 12))
    const missing = getMissingSlots('create_transaction', slots)
    expect(missing).toContain('description')
    expect(missing).toContain('date')
  })

  it('resumo sem periodo pede periodo', () => {
    const slots = extractEntities('resumo', 'show_summary', new Date(2026, 4, 12))
    expect(getMissingSlots('show_summary', slots)).toEqual(['period'])
  })
})

