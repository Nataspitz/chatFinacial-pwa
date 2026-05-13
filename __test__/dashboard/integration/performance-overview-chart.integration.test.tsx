/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PerformanceOverviewChart } from '../../../src/pages/Dashboard/components/PerformanceOverviewChart/PerformanceOverviewChart'
import { __rechartsMock } from '../mocks/recharts.mock'

vi.mock('recharts', async () => import('../mocks/recharts.mock'))

describe('PerformanceOverviewChart - integration', () => {
  beforeEach(() => {
    __rechartsMock.reset()
  })

  it('renderiza tooltip com labels de saldo e resultado vs mes anterior', () => {
    const currentYearData = [
      { label: 'Jan', revenue: 1200, expense: 200, profit: 1000, cumulativeProfit: 1000 },
      { label: 'Fev', revenue: 300, expense: 500, profit: -200, cumulativeProfit: 800 }
    ]

    const { rerender } = render(
      <PerformanceOverviewChart currentYear={2026} currentYearData={currentYearData} totalAnnualData={[]} />
    )

    const initialData = __rechartsMock.getLatestBarChartData()
    expect(initialData[0]?.deltaFromPrevious).toBeNull()
    expect(initialData[1]?.deltaFromPrevious).toBe(-200)
    expect(screen.getByText('Saldo em conta: R$ 1000.00')).toBeInTheDocument()
    expect(screen.getByText('Resultado vs mês anterior: sem base')).toBeInTheDocument()

    __rechartsMock.setTooltipPointIndex(1)
    rerender(<PerformanceOverviewChart currentYear={2026} currentYearData={currentYearData} totalAnnualData={[]} />)

    expect(screen.getByText('Saldo em conta: R$ 800.00')).toBeInTheDocument()
    expect(screen.getByText('Resultado vs mês anterior: -R$ 200.00')).toBeInTheDocument()
  })

  it('troca o escopo para periodo total anual com filtro interno do proprio card', async () => {
    const user = userEvent.setup()
    const totalAnnualData = [
      { label: '2024', revenue: 2000, expense: 1200, profit: 800, cumulativeProfit: 800 },
      { label: '2025', revenue: 2500, expense: 1400, profit: 1100, cumulativeProfit: 1900 }
    ]

    render(
      <PerformanceOverviewChart
        currentYear={2026}
        currentYearData={[{ label: 'Jan', revenue: 100, expense: 0, profit: 100, cumulativeProfit: 100 }]}
        totalAnnualData={totalAnnualData}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Período total (anual)' }))

    const annualChartData = __rechartsMock.getLatestBarChartData()
    expect(annualChartData.map((item) => item.label)).toEqual(['2024', '2025'])
    expect(annualChartData[0]?.deltaFromPrevious).toBeNull()
    expect(annualChartData[1]?.deltaFromPrevious).toBe(1100)
  })
})
