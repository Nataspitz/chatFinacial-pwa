import { describe, expect, it } from 'vitest'
import { extractTransactionType } from '../../../src/features/chat/assistant'

describe('extractTransactionType', () => {
  it('detecta despesa', () => {
    expect(extractTransactionType('gastei 50 no mercado')).toBe('expense')
  })

  it('detecta entrada', () => {
    expect(extractTransactionType('recebi 500 hoje')).toBe('income')
  })
})

