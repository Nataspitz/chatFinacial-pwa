import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildSlicesForMonth, mapAuditSlices } from '../../../src/pages/Auditoria/auditoria.utils'
import type { FinancialAudit } from '../../../src/types/financial-audit.types'

const buildAudit = (overrides: Partial<FinancialAudit>): FinancialAudit => ({
  id: 'audit-1',
  userId: 'user-1',
  monthRef: '2026-05-01',
  auditSlice: 1,
  periodStart: '2026-05-01',
  periodEnd: '2026-05-10',
  unlockAt: '2026-05-11',
  status: 'pending',
  certificateBucket: null,
  certificatePath: null,
  certificateMimeType: null,
  certificateSizeBytes: null,
  confirmedAt: null,
  confirmedBy: null,
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides
})

describe('auditoria utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('habilita envio de certificado somente para auditoria pendente ja liberada', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 11))

    const [released, future, confirmed] = mapAuditSlices([
      buildAudit({ id: 'released', auditSlice: 1, unlockAt: '2026-05-11', status: 'pending' }),
      buildAudit({ id: 'future', auditSlice: 2, unlockAt: '2026-05-21', status: 'pending' }),
      buildAudit({ id: 'confirmed', auditSlice: 3, unlockAt: '2026-05-11', status: 'confirmed' })
    ])

    expect(released.canUploadCertificate).toBe(true)
    expect(future.canUploadCertificate).toBe(false)
    expect(confirmed.canUploadCertificate).toBe(false)
  })
})
