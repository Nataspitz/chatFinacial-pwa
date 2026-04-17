import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Calendario } from '../../../src/pages/Calendario/Calendario'
import { calendarDataMock } from '../mocks/calendar-data.mock'

const useCalendarDataMock = vi.fn()

vi.mock('../../../src/pages/Calendario/hooks/useCalendarData', () => ({
  useCalendarData: () => useCalendarDataMock()
}))

describe('Calendario integration', () => {
  it('renderiza calendario com resumo mensal quando carregado', () => {
    useCalendarDataMock.mockReturnValue(calendarDataMock)

    render(<Calendario />)

    expect(screen.getByText('Calendario Financeiro')).toBeInTheDocument()
    expect(screen.getByText('Entradas: R$ 200.00')).toBeInTheDocument()
    expect(screen.getByText('Saidas: R$ 50.00')).toBeInTheDocument()
  })

  it('renderiza estado de loading quando hook esta carregando', () => {
    useCalendarDataMock.mockReturnValue({
      ...calendarDataMock,
      isLoading: true
    })

    render(<Calendario />)

    expect(screen.getByText('Carregando calendario...')).toBeInTheDocument()
  })
})
