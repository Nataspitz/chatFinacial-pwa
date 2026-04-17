/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GrowthLineChart } from '../../../src/pages/Dashboard/components/GrowthLineChart/GrowthLineChart'
import { __rechartsMock } from '../mocks/recharts.mock'

vi.mock('recharts', async () => import('../mocks/recharts.mock'))

describe('GrowthLineChart - unit', () => {
  beforeEach(() => {
    __rechartsMock.reset()
  })

  it('usa serie de receita (dataKey="revenue") na linha principal', () => {
    render(
      <GrowthLineChart
        data={[
          { label: 'Fev/26', revenue: 1200, expense: 600, profit: 600, year: 2026, month: 2 },
          { label: 'Mar/26', revenue: 900, expense: 1100, profit: -200, year: 2026, month: 3 }
        ]}
      />
    )

    const lineProps = __rechartsMock.getLatestLineProps()
    expect(lineProps?.dataKey).toBe('revenue')
    expect(lineProps?.stroke).toBe('#16c784')
  })
})
