import { describe, expect, it } from 'vitest'
import {
  buildPerformanceOverviewSeries,
  parseTransactionDate
} from '../../../src/pages/Dashboard/dashboard-calculations'
import type { NormalizedTransaction } from '../../../src/pages/Dashboard/types'
import type { Transaction } from '../../../src/types/transaction.types'
import { dashboardTransactionsFixture } from '../mocks/dashboard-fixtures'

const normalizeTransactions = (transactions: Transaction[]): NormalizedTransaction[] => {
  return transactions.map((item) => {
    const parsedDate = parseTransactionDate(item.date)
    if (!parsedDate) {
      throw new Error(`Data invalida no fixture: ${item.date}`)
    }

    return {
      ...item,
      parsedDate,
      year: parsedDate.getFullYear(),
      month: parsedDate.getMonth() + 1,
      day: parsedDate.getDate()
    }
  })
}

describe('dashboard-calculations - buildPerformanceOverviewSeries', () => {
  it('zera meses futuros no ano atual e aplica cutoff para ignorar movimentos futuros', () => {
    const cutoffTime = new Date(2026, 3, 17, 23, 59, 59, 999).getTime()
    const normalized = normalizeTransactions(dashboardTransactionsFixture)

    const series = buildPerformanceOverviewSeries(normalized, 'monthly', 2026, {
      zeroFutureMonthsAfter: 4,
      cutoffTime
    })

    expect(series).toHaveLength(12)
    expect(series[3]).toMatchObject({
      label: 'Abr',
      revenue: 50,
      expense: 100,
      profit: -50,
      cumulativeProfit: 650
    })
    expect(series[4]).toMatchObject({
      label: 'Mai',
      revenue: 0,
      expense: 0,
      profit: 0,
      cumulativeProfit: 0
    })
    expect(series[11]).toMatchObject({
      label: 'Dez',
      revenue: 0,
      expense: 0,
      profit: 0,
      cumulativeProfit: 0
    })
  })

  it('mantem compatibilidade no modo anual com acumulado e cutoff por data', () => {
    const cutoffTime = new Date(2026, 3, 17, 23, 59, 59, 999).getTime()
    const normalized = normalizeTransactions(dashboardTransactionsFixture)

    const annualSeries = buildPerformanceOverviewSeries(normalized, 'annual', 2026, {
      cutoffTime
    })

    expect(annualSeries).toEqual([
      {
        label: '2025',
        revenue: 400,
        expense: 0,
        profit: 400,
        cumulativeProfit: 400
      },
      {
        label: '2026',
        revenue: 1050,
        expense: 400,
        profit: 650,
        cumulativeProfit: 1050
      }
    ])
  })
})
