/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardData } from '../../../src/pages/Dashboard/hooks/useDashboardData'
import { businessService } from '../../../src/services/business.service'
import { financialSummaryService } from '../../../src/services/financial-summary.service'
import { financeService } from '../../../src/services/finance.service'
import type { FinancialMonthlySummary } from '../../../src/types/financial-summary.types'
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
  const buildYearSummaries = (
    year: number,
    overrides: Record<number, Partial<FinancialMonthlySummary>> = {}
  ): FinancialMonthlySummary[] =>
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const monthRef = `${year}-${String(month).padStart(2, '0')}-01`
      return {
        id: `summary-${monthRef}`,
        userId: 'company-1',
        monthRef,
        totalEntries: 0,
        totalOutcomes: 0,
        resultBalance: 0,
        accountBalance: 0,
        calculatedAt: '2026-04-17T12:00:00.000Z',
        createdAt: '2026-04-17T12:00:00.000Z',
        updatedAt: '2026-04-17T12:00:00.000Z',
        ...overrides[month]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))

    vi.mocked(financeService.getTransactions).mockResolvedValue(dashboardTransactionsFixture)
    vi.mocked(businessService.getBusinessSettings).mockResolvedValue(businessSettingsFixture)
    vi.mocked(financialSummaryService.listYear).mockResolvedValue([])
    vi.mocked(financialSummaryService.refreshYear).mockResolvedValue([])
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

  it('atualiza automaticamente o resumo salvo quando ele diverge dos totais do report', async () => {
    vi.mocked(financialSummaryService.listYear).mockResolvedValue(
      buildYearSummaries(2026, {
        4: {
          totalEntries: 999,
          totalOutcomes: 0,
          resultBalance: 999,
          accountBalance: 999
        }
      })
    )
    vi.mocked(financialSummaryService.refreshYear).mockResolvedValue(
      buildYearSummaries(2026, {
        4: {
          totalEntries: 750,
          totalOutcomes: 100,
          resultBalance: 650,
          accountBalance: 650
        }
      })
    )

    const { result } = renderHook(() => useDashboardData())

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(financialSummaryService.refreshYear).toHaveBeenCalledWith(2026)
    expect(result.current.currentTotals).toMatchObject({
      revenue: 750,
      expense: 100,
      profit: 650
    })
  })
})
