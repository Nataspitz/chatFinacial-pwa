import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Dashboard } from '../../../src/pages/Dashboard/Dashboard'
import { buildDashboardHookMock } from '../mocks/dashboard-hook.mock'

const useDashboardDataMock = vi.fn()

vi.mock('../../../src/pages/Dashboard/hooks/useDashboardData', () => ({
  useDashboardData: () => useDashboardDataMock()
}))

describe('Dashboard integration', () => {
  it('renderiza secao de evolucao da receita com os dados carregados', () => {
    useDashboardDataMock.mockReturnValue(buildDashboardHookMock())

    render(<Dashboard />)

    expect(screen.getByText('Dashboard Executiva')).toBeInTheDocument()
    expect(screen.getByText('Evolução da receita')).toBeInTheDocument()
    expect(screen.getByText('Faturamento por período (mês ou ano).')).toBeInTheDocument()
  })

  it('renderiza estado vazio quando nao ha transacoes', () => {
    useDashboardDataMock.mockReturnValue({
      ...buildDashboardHookMock(),
      shouldShowLoadedContent: false,
      shouldShowEmptyState: true
    })

    render(<Dashboard />)

    expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument()
  })
})
