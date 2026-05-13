import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CalendarGrid } from '../../../src/pages/Calendario/components/CalendarGrid'

describe('CalendarGrid', () => {
  it('renderiza totais de entrada e saida por dia', () => {
    render(
      <CalendarGrid
        weekDays={['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']}
        todayKey="2026-04-17"
        formatCurrency={(value) => `R$ ${value.toFixed(2)}`}
        cells={[
          {
            key: '2026-04-17',
            date: new Date(2026, 3, 17),
            isCurrentMonth: true,
            totals: { entrada: 500, saida: 200 }
          }
        ]}
      />
    )

    expect(screen.getByText('Entradas: R$ 500.00')).toBeInTheDocument()
    expect(screen.getByText('Saídas: R$ 200.00')).toBeInTheDocument()
  })
})
