import { describe, expect, it } from 'vitest'

import { getExportDateRange } from '../../../src/pages/Report/components/report-page.utils'
import type { ExportFormState } from '../../../src/pages/Report/components/report-page.types'

const buildExportForm = (overrides: Partial<ExportFormState>): ExportFormState => ({
  fileName: 'relatorio-financeiro',
  periodType: 'month',
  year: '2026',
  month: '05',
  day: '11',
  startDay: '01',
  endDay: '10',
  ...overrides
})

describe('report export period', () => {
  it('gera intervalo parcial dentro do mes selecionado', () => {
    expect(getExportDateRange(buildExportForm({ periodType: 'monthRange', startDay: '01', endDay: '10' }))).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-10'
    })
  })
})
