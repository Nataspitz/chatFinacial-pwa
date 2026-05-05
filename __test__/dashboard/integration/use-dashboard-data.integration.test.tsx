/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardData } from '../../../src/pages/Dashboard/hooks/useDashboardData'
import { businessService } from '../../../src/services/business.service'
import { financialSummaryService } from '../../../src/services/financial-summary.service'
import { financeService } from '../../../src/services/finance.service'
import { businessSettingsFixture, dashboardTransactionsFixture } from '../mocks/dashboard-fixtures'

vi.mock('../../../src/services/finance.service', () => ({
  financeService: {
    getTransactions: vi.fn()
  }
}))

vi.mock('../../../src/services/business.service', () => ({
  businessService: {
    getBusinessSettings: vi.fn()
  }
}))

vi.mock('../../../src/services/financial-summary.service', () => ({
  financialSummaryService: {
    listYear: vi.fn(),
    refreshYear: vi.fn()
  }
}))

describe('useDashboardData - integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))

    vi.mocked(financeService.getTransactions).mockResolvedValue(dashboardTransactionsFixture)
    vi.mocked(businessService.getBusinessSettings).mockResolvedValue(businessSettingsFixture)
    vi.mocked(financialSummaryService.listYear).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gera serie de desempenho sem lancamentos futuros e com meses futuros zerados no ano atual', async () => {
    const { result } = renderHook(() => useDashboardData())

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.isLoading).toBe(false)
    const performanceSeries = result.current.performanceOverviewCurrentYearSeries
    expect(performanceSeries).toHaveLength(12)
    expect(performanceSeries[3]).toMatchObject({
      label: 'Abr',
      revenue: 50,
      expense: 100,
      profit: -50,
      cumulativeProfit: 650
    })
    expect(performanceSeries[4]).toMatchObject({
      label: 'Mai',
      revenue: 0,
      expense: 0,
      profit: 0,
      cumulativeProfit: 0
    })
  })

  it('monta serie de evolucao para o card de receita usando campo revenue', async () => {
    const { result } = renderHook(() => useDashboardData())

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.isLoading).toBe(false)
    const aprilPoint = result.current.lineSeries.find((item) => item.label === '04/26')
    expect(aprilPoint).toBeDefined()
    expect(aprilPoint?.revenue).toBe(750)
    expect(aprilPoint?.expense).toBe(0)
  })
})
