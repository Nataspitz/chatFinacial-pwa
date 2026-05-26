// @vitest-environment jsdom
import '../../setup'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../../../src/types/transaction.types'
import { createReportCategoryMap, createReportTransaction } from '../mocks/report-transactions.mock'
import {
  resetFinanceServiceMock,
  resetTransactionSettingsServiceMock,
  setFinanceServiceMockData
} from '../mocks/report-services.mock'
import { resetAuthMockState } from '../mocks/auth-context.mock'

const tablePropsStore = vi.hoisted(() => ({
  byTitle: new Map<string, { transactions: Transaction[]; totalLabel: string }>()
}))

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

vi.mock('../../../src/pages/Report/components/TransactionsTable', () => ({
  TransactionsTable: (props: {
    title: string
    transactions: Transaction[]
    totalLabel: string
  }) => {
    tablePropsStore.byTitle.set(props.title, {
      transactions: props.transactions,
      totalLabel: props.totalLabel
    })

    return <section data-testid={`mocked-table-${props.title}`}>{props.title}</section>
  }
}))

import { ReportPage } from '../../../src/pages/Report/components/ReportPage'

const toIsoDate = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (base: Date, days: number): string => {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)
  return toIsoDate(date)
}

const withMonthOffset = (base: Date, monthOffset: number, day: number): string => {
  return toIsoDate(new Date(base.getFullYear(), base.getMonth() + monthOffset, day))
}

const getReportTable = (title: string): { transactions: Transaction[]; totalLabel: string } | undefined =>
  tablePropsStore.byTitle.get(title)

describe('ReportPage - unit - classificacao de futuro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 3, 15))
    tablePropsStore.byTitle.clear()
    resetFinanceServiceMock()
    resetTransactionSettingsServiceMock()
    resetAuthMockState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('separa transacoes com data maior que hoje em grupos futuros', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'entrada-hoje',
          type: 'entrada',
          amount: 120,
          date: toIsoDate(now),
          description: 'Receita hoje'
        }),
        createReportTransaction({
          id: 'entrada-futura',
          type: 'entrada',
          amount: 900,
          date: addDays(now, 3),
          description: 'Receita futura',
          isConfirmed: false
        }),
        createReportTransaction({
          id: 'saida-hoje',
          type: 'saida',
          amount: 40,
          date: addDays(now, -1),
          description: 'Despesa atual'
        }),
        createReportTransaction({
          id: 'saida-futura',
          type: 'saida',
          amount: 300,
          date: addDays(now, 5),
          description: 'Despesa futura',
          isConfirmed: false
        })
      ]
    })

    render(<ReportPage />)

    await waitFor(() => {
      expect(tablePropsStore.byTitle.size).toBe(4)
    })

    const entradas = tablePropsStore.byTitle.get('Entradas')
    const entradasFuturas = tablePropsStore.byTitle.get('Entradas futuras')
    const saidas = tablePropsStore.byTitle.get('Saídas')
    const saidasFuturas = tablePropsStore.byTitle.get('Saídas futuras')

    expect(entradas?.transactions.map((item) => item.id)).toEqual(['entrada-hoje'])
    expect(entradasFuturas?.transactions.map((item) => item.id)).toEqual(['entrada-futura'])
    expect(saidas?.transactions.map((item) => item.id)).toEqual(['saida-hoje'])
    expect(saidasFuturas?.transactions.map((item) => item.id)).toEqual(['saida-futura'])
  })

  it('mantem transacao no dia atual nos grupos principais (nao futuros)', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'entrada-ontem',
          type: 'entrada',
          amount: 300,
          date: addDays(now, -1)
        }),
        createReportTransaction({
          id: 'entrada-hoje',
          type: 'entrada',
          amount: 700,
          date: toIsoDate(now)
        }),
        createReportTransaction({
          id: 'entrada-amanha',
          type: 'entrada',
          amount: 50,
          date: addDays(now, 1),
          isConfirmed: false
        }),
        createReportTransaction({
          id: 'saida-hoje',
          type: 'saida',
          amount: 120,
          date: toIsoDate(now)
        })
      ]
    })

    render(<ReportPage />)

    await waitFor(() => {
      expect(tablePropsStore.byTitle.size).toBe(4)
    })

    const entradas = tablePropsStore.byTitle.get('Entradas')
    const entradasFuturas = tablePropsStore.byTitle.get('Entradas futuras')
    const saidas = tablePropsStore.byTitle.get('Saídas')
    const saidasFuturas = tablePropsStore.byTitle.get('Saídas futuras')

    expect(entradas?.transactions.map((item) => item.id)).toEqual(['entrada-ontem', 'entrada-hoje'])
    expect(entradasFuturas?.transactions.map((item) => item.id)).toEqual(['entrada-amanha'])
    expect(saidas?.transactions.map((item) => item.id)).toEqual(['saida-hoje'])
    expect(saidasFuturas?.transactions).toEqual([])
  })

  it('move transacao futura confirmada para os grupos principais', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'entrada-futura-confirmada',
          type: 'entrada',
          amount: 250,
          date: addDays(now, 7),
          isConfirmed: true
        }),
        createReportTransaction({
          id: 'saida-futura-confirmada',
          type: 'saida',
          amount: 80,
          date: addDays(now, 7),
          isConfirmed: true
        }),
        createReportTransaction({
          id: 'saida-futura-aberta',
          type: 'saida',
          amount: 90,
          date: addDays(now, 7),
          isConfirmed: false
        })
      ]
    })

    render(<ReportPage />)

    await waitFor(() => {
      expect(tablePropsStore.byTitle.size).toBe(4)
    })

    const entradas = tablePropsStore.byTitle.get('Entradas')
    const entradasFuturas = tablePropsStore.byTitle.get('Entradas futuras')
    const saidas = tablePropsStore.byTitle.get('Saídas')
    const saidasFuturas = tablePropsStore.byTitle.get('Saídas futuras')

    expect(entradas?.transactions.map((item) => item.id)).toEqual(['entrada-futura-confirmada'])
    expect(entradasFuturas?.transactions).toEqual([])
    const saidaConfirmadaTable = Array.from(tablePropsStore.byTitle.entries()).find(([, table]) =>
      table.transactions.some((item) => item.id === 'saida-futura-confirmada')
    )
    const saidaAbertaTable = Array.from(tablePropsStore.byTitle.entries()).find(([, table]) =>
      table.transactions.some((item) => item.id === 'saida-futura-aberta')
    )

    expect(saidaConfirmadaTable?.[0].toLowerCase()).not.toContain('futuras')
    expect(saidaAbertaTable?.[0].toLowerCase()).toContain('futuras')
  })

  it('mantem reembolsadas em saidas por padrao sem somar nos totais', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'saida-reembolsada',
          type: 'saida',
          amount: 300,
          date: toIsoDate(now),
          status: 'refunded',
          ignoredInReports: true
        }),
        createReportTransaction({
          id: 'saida-valida',
          type: 'saida',
          amount: 80,
          date: toIsoDate(now)
        })
      ]
    })

    render(<ReportPage />)

    await waitFor(() => {
      const saidas = tablePropsStore.byTitle.get('Saídas')
      expect(saidas?.transactions.map((item) => item.id)).toEqual(['saida-reembolsada', 'saida-valida'])
      expect(saidas?.totalLabel).toBe('R$ 80,00')
    })
  })

  it('move saida futura reembolsada para saidas sem somar em saidas futuras', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'saida-futura-reembolsada',
          type: 'saida',
          amount: 300,
          date: addDays(now, 5),
          isConfirmed: false,
          status: 'refunded',
          ignoredInReports: true
        }),
        createReportTransaction({
          id: 'saida-futura-valida',
          type: 'saida',
          amount: 80,
          date: addDays(now, 5),
          isConfirmed: false
        })
      ]
    })

    render(<ReportPage />)

    await waitFor(() => {
      const saidas = tablePropsStore.byTitle.get('Saídas')
      const saidasFuturas = tablePropsStore.byTitle.get('Saídas futuras')
      expect(saidas?.transactions.map((item) => item.id)).toEqual(['saida-futura-reembolsada'])
      expect(saidas?.totalLabel).toBe('R$ 0,00')
      expect(saidasFuturas?.transactions.map((item) => item.id)).toEqual(['saida-futura-valida'])
      expect(saidasFuturas?.totalLabel).toBe('R$ 80,00')
    })
  })

  it('regressao: custo mensal respeita filtro de dia sem quebrar classificacao', async () => {
    const now = new Date()

    setFinanceServiceMockData({
      categories: createReportCategoryMap(),
      transactions: [
        createReportTransaction({
          id: 'aluguel-base',
          type: 'saida',
          category: 'Aluguel',
          amount: 220,
          date: withMonthOffset(now, -2, 1),
          isMonthlyCost: true
        }),
        createReportTransaction({
          id: 'entrada-dia-10',
          type: 'entrada',
          amount: 900,
          date: withMonthOffset(now, 0, 10),
          description: 'Venda dia 10'
        })
      ]
    })

    render(<ReportPage />)

    await waitFor(() => {
      const saidas = tablePropsStore.byTitle.get('Saídas')
      expect(saidas?.transactions.map((item) => item.id)).toEqual(['aluguel-base'])
      expect(saidas?.transactions[0]?.date).toBe(withMonthOffset(now, 0, 1))
    })

    fireEvent.click(screen.getByRole('button', { name: /abrir filtros/i }))
    const modal = await screen.findByRole('dialog', { name: 'Filtros' })
    fireEvent.change(within(modal).getByLabelText('Dia'), {
      target: {
        value: '10'
      }
    })
    fireEvent.click(within(modal).getByRole('button', { name: /aplicar filtros/i }))

    await waitFor(() => {
      const saidas = tablePropsStore.byTitle.get('Saídas')
      expect(saidas?.transactions).toEqual([])
    })
  })
})
