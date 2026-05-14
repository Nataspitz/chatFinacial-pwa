import { describe, expect, it } from 'vitest'
import { detectIntent } from '../../../src/features/chat/assistant'

describe('detectIntent', () => {
  it.each([
    ['ola', 'greeting'],
    ['listar transacoes', 'list_transactions'],
    ['gastei 70 reais com internet ontem', 'create_transaction'],
    ['qual meu saldo esse mes', 'show_balance'],
    ['resumo de marco de 2026', 'show_summary']
  ] as const)('detecta "%s" como %s', (message, intent) => {
    expect(detectIntent(message)).toBe(intent)
  })
})

