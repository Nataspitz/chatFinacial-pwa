import { describe, expect, it } from 'vitest'
import { extractPeriod } from '../../../src/features/chat/assistant'

describe('extractPeriod', () => {
  const referenceDate = new Date(2026, 4, 12)

  it('extrai mes e ano', () => {
    expect(extractPeriod('marco de 2026', referenceDate)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
      label: 'marco de 2026'
    })
  })

  it('extrai hoje e ontem', () => {
    expect(extractPeriod('hoje', referenceDate)?.start).toBe('2026-05-12')
    expect(extractPeriod('ontem', referenceDate)?.start).toBe('2026-05-11')
  })

  it('extrai mes passado completo', () => {
    expect(extractPeriod('mes passado', referenceDate)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
      label: 'mês passado'
    })
  })

  it('extrai intervalo explicito', () => {
    expect(extractPeriod('de 01/03/2026 ate 31/03/2026', referenceDate)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
      label: '01/03/2026 até 31/03/2026'
    })
  })

  it('extrai dia especifico com mes e ano', () => {
    expect(extractPeriod('listar transacoes do dia 12 de maio de 2026', referenceDate)).toEqual({
      start: '2026-05-12',
      end: '2026-05-12',
      label: 'dia 12 de maio de 2026'
    })
  })
})
