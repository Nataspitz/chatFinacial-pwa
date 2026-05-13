import { describe, expect, it } from 'vitest'
import { extractAmount } from '../../../src/features/chat/assistant'

describe('extractAmount', () => {
  it.each([
    ['gastei 50 no mercado', 50],
    ['gastei R$ 1.200,50 no aluguel', 1200.5],
    ['listar transações de março de 2026', null]
  ] as const)('extrai valor de "%s"', (message, amount) => {
    expect(extractAmount(message)).toBe(amount)
  })
})
