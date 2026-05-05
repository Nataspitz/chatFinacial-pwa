// @vitest-environment jsdom
import '../../setup'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getReportSectionByTitle } from '../mocks/report-dom.helpers'
import { createReportCategoryMap, createReportTransaction } from '../mocks/report-transactions.mock'
import {
  resetFinanceServiceMock,
  resetTransactionSettingsServiceMock,
  setFinanceServiceMockData
} from '../mocks/report-services.mock'
import { resetAuthMockState } from '../mocks/auth-context.mock'

vi.mock('../../../src/services/finance.service', async () => {
  const mocks = await import('../mocks/report-services.mock')
  return {
    financeService: mocks.financeServiceMock
  }
})

vi.mock('../../../src/services/transaction-settings.service', async () => {
  const mocks = await import('../mocks/report-services.mock')
  return {
    transactionSettingsService: mocks.transactionSettingsServiceMock
  }
})

vi.mock('../../../src/contexts/AuthContext', async () => {
  const mocks = await import('../mocks/auth-context.mock')
  return {
    useAuth: mocks.useAuthMock
  }
})

import { ReportPage } from '../../../src/pages/Report/components/ReportPage'

const toIsoDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (base: Date, days: number): string => {
  return toIsoDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days))
}

const withMonthOffset = (base: Date, monthOffset: number, day: number): string => {
  return toIsoDate(new Date(base.getFullYear(), base.getMonth() + monthOffset, day))
}

describe('ReportPage - integration - fluxos de futuro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 3, 15))
    resetFinanceServiceMock()
    resetTransactionSettingsServiceMock()
    resetAuthMockState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('classifica entradas e saidas futuras em grupos separados', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'entrada-atual',
          type: 'entrada',
          category: 'Consultoria',
          amount: 123.45,
          date: addDays(now, -2),
          description: 'Receita entregue'
        }),
        createReportTransaction({
          id: 'entrada-futura',
          type: 'entrada',
          category: 'Contrato pendente',
          amount: 950.6,
          date: addDays(now, 4),
          description: 'Receita futura',
          isConfirmed: false
        }),
        createReportTransaction({
          id: 'saida-atual',
          type: 'saida',
          category: 'Operacao',
          amount: 50.25,
          date: addDays(now, -3),
          description: 'Despesa paga'
        }),
        createReportTransaction({
          id: 'saida-futura',
          type: 'saida',
          category: 'Fornecedor',
          amount: 199.99,
          date: addDays(now, 5),
          description: 'Despesa futura',
          isConfirmed: false
        })
      ]
    })

    render(<ReportPage />)
    await screen.findByRole('heading', { name: 'Entradas futuras' })

    const entradas = getReportSectionByTitle('Entradas')
    const entradasFuturas = getReportSectionByTitle('Entradas futuras')
    const saidas = getReportSectionByTitle('Saídas')
    const saidasFuturas = getReportSectionByTitle('Saídas futuras')

    expect(within(entradas).getAllByText('Receita entregue').length).toBeGreaterThan(0)
    expect(within(entradas).queryAllByText('Receita futura')).toHaveLength(0)
    expect(within(entradasFuturas).getAllByText('Receita futura').length).toBeGreaterThan(0)

    expect(within(saidas).getAllByText('Despesa paga').length).toBeGreaterThan(0)
    expect(within(saidas).queryAllByText('Despesa futura')).toHaveLength(0)
    expect(within(saidasFuturas).getAllByText('Despesa futura').length).toBeGreaterThan(0)
  })

  it('nao manda lancamento no dia atual para os grupos futuros', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'entrada-hoje',
          type: 'entrada',
          amount: 400,
          date: toIsoDate(now),
          description: 'Receita de hoje'
        }),
        createReportTransaction({
          id: 'saida-hoje',
          type: 'saida',
          amount: 230,
          date: toIsoDate(now),
          description: 'Despesa de hoje'
        })
      ]
    })

    render(<ReportPage />)
    await screen.findByRole('heading', { name: 'Entradas futuras' })

    const entradas = getReportSectionByTitle('Entradas')
    const saidas = getReportSectionByTitle('Saídas')
    const entradasFuturas = getReportSectionByTitle('Entradas futuras')
    const saidasFuturas = getReportSectionByTitle('Saídas futuras')

    expect(within(entradas).getAllByText('Receita de hoje').length).toBeGreaterThan(0)
    expect(within(saidas).getAllByText('Despesa de hoje').length).toBeGreaterThan(0)
    expect(within(entradasFuturas).getByText(/sem entradas futuras/i)).toBeInTheDocument()
    expect(within(saidasFuturas).getByText(/sem sa[ií]das futuras/i)).toBeInTheDocument()
  })

  it('regressao: custo mensal entra no mes filtrado e sai quando o filtro de dia nao bate', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap({
        saida: [
          {
            id: 'cat-aluguel',
            type: 'saida',
            name: 'Aluguel'
          }
        ]
      }),
      transactions: [
        createReportTransaction({
          id: 'custo-mensal',
          type: 'saida',
          category: 'Aluguel',
          amount: 180,
          date: withMonthOffset(now, -2, 1),
          description: 'Aluguel recorrente',
          isMonthlyCost: true
        }),
        createReportTransaction({
          id: 'entrada-dia-10',
          type: 'entrada',
          category: 'Receita',
          amount: 800,
          date: withMonthOffset(now, 0, 10),
          description: 'Receita dia 10'
        })
      ]
    })

    render(<ReportPage />)
    await screen.findByRole('heading', { name: 'Saídas' })

    const saidas = getReportSectionByTitle('Saídas')
    expect(within(saidas).getAllByText('Aluguel recorrente').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /abrir filtros/i }))
    const modal = await screen.findByRole('dialog', { name: 'Filtros' })
    fireEvent.change(within(modal).getByLabelText('Dia'), {
      target: {
        value: '10'
      }
    })
    fireEvent.click(within(modal).getByRole('button', { name: /aplicar filtros/i }))

    await waitFor(() => {
      const saidasFiltradas = getReportSectionByTitle('Saídas')
      expect(within(saidasFiltradas).queryByText('Aluguel recorrente')).not.toBeInTheDocument()
      expect(within(saidasFiltradas).getByText(/sem sa[ií]das at[eé] hoje/i)).toBeInTheDocument()
    })
  })
})
