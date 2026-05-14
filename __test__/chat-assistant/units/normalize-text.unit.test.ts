import { describe, expect, it } from 'vitest'
import { normalizeText } from '../../../src/features/chat/assistant'

describe('normalizeText', () => {
  it('normaliza acentos, caixa e espacos', () => {
    expect(normalizeText('Quero listar as transações de Maio!')).toBe(
      'quero listar as transacoes de maio'
    )
  })
})

