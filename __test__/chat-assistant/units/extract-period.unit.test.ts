import { describe, expect, it } from 'vitest'
import { extractPeriod } from '../../../src/features/chat/assistant'

describe('extractPeriod', () => {
  const referenceDate = new Date(2026, 4, 12)

  it('extrai mês e ano em português', () => {
    expect(extractPeriod('março de 2026', referenceDate)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
      label: 'março de 2026'
    })
  })

  it('extrai hoje pela data de referência', () => {
    expect(extractPeriod('hoje', referenceDate)).toEqual({
      start: '2026-05-12',
      end: '2026-05-12',
      label: 'hoje'
    })
  })

  it('extrai ontem pela data de referência', () => {
    expect(extractPeriod('ontem', referenceDate)).toEqual({
      start: '2026-05-11',
      end: '2026-05-11',
      label: 'ontem'
    })
  })

  it('extrai mês passado completo', () => {
    expect(extractPeriod('mês passado', referenceDate)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
      label: 'mês passado'
    })
  })

  it('extrai intervalo explícito', () => {
    expect(extractPeriod('de 01/03/2026 até 31/03/2026', referenceDate)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
      label: '01/03/2026 até 31/03/2026'
    })
  })
})
