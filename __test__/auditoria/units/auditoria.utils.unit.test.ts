import { describe, expect, it } from 'vitest'

import { buildSlicesForMonth } from '../../../src/pages/Auditoria/auditoria.utils'

describe('auditoria utils', () => {
  it('libera cada auditoria no dia seguinte ao fim da faixa', () => {
    expect(buildSlicesForMonth('2026-05-01')).toEqual([
      {
        auditSlice: 1,
        periodStart: '2026-05-01',
        periodEnd: '2026-05-10',
        unlockAt: '2026-05-11'
      },
      {
        auditSlice: 2,
        periodStart: '2026-05-11',
        periodEnd: '2026-05-20',
        unlockAt: '2026-05-21'
      },
      {
        auditSlice: 3,
        periodStart: '2026-05-21',
        periodEnd: '2026-05-31',
        unlockAt: '2026-06-01'
      }
    ])
  })
})
