import { describe, expect, it } from 'vitest'
import { extractCategoryHint } from '../../../src/features/chat/assistant'

describe('extractCategoryHint', () => {
  it('extrai categoria mercado', () => {
    expect(extractCategoryHint('gastei 50 no mercado ontem')).toBe('Mercado')
  })
})

