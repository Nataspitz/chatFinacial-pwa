import { describe, expect, it } from 'vitest'
import { detectIntent } from '../../../src/features/chat/assistant'

describe('detectIntent', () => {
  it.each([
    ['listar transações', 'list_transactions'],
    ['mostrar gastos de março de 2026', 'list_transactions'],
    ['gastei 50 no mercado', 'create_transaction'],
    ['qual meu saldo esse mês', 'show_balance'],
    ['resumo de março de 2026', 'show_summary']
  ] as const)('detecta "%s" como %s', (message, intent) => {
    expect(detectIntent(message)).toBe(intent)
  })
})
