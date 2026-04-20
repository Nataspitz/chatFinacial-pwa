import { useMemo, useState } from 'react'
import { ModalBase } from '../../components/ui'
import { LoadingState } from '../../components/organisms/LoadingState/LoadingState'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { CalendarGrid } from './components/CalendarGrid'
import { CalendarToolbar } from './components/CalendarToolbar'
import { MonthSummary } from './components/MonthSummary'
import { PageHeader } from './components/PageHeader'
import { useCalendarData } from './hooks/useCalendarData'
import type { CalendarCell } from './types'
import styles from './Calendario.module.css'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export const Calendario = (): JSX.Element => {
  const calendar = useCalendarData()
  const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null)

  const selectedDateLabel = useMemo(() => {
    if (!selectedCell) {
      return ''
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(selectedCell.date)
  }, [selectedCell])

  return (
    <PageTemplate className={styles.page}>
      <PageHeader />

      <CalendarToolbar
        currentMonth={calendar.currentMonth}
        availableYears={calendar.availableYears}
        onPreviousMonth={calendar.goToPreviousMonth}
        onNextMonth={calendar.goToNextMonth}
        onYearChange={calendar.onYearChange}
        formatMonthTitle={calendar.formatMonthTitle}
      />

      <MonthSummary
        totalEntrada={calendar.monthTotalEntrada}
        totalSaida={calendar.monthTotalSaida}
        formatCurrency={calendar.formatCurrency}
      />

      {calendar.isLoading && <LoadingState label="Carregando calendario..." />}
      {calendar.error && <p className={styles.error}>{calendar.error}</p>}

      {!calendar.isLoading && !calendar.error ? (
        <CalendarGrid
          cells={calendar.cells}
          selectedDateKey={selectedCell?.key ?? null}
          weekDays={WEEK_DAYS}
          todayKey={calendar.todayKey}
          formatCurrency={calendar.formatCurrency}
          onSelectDate={setSelectedCell}
        />
      ) : null}

      <ModalBase
        open={selectedCell !== null}
        title={selectedCell ? `Detalhes de ${selectedDateLabel}` : 'Detalhes do dia'}
        onClose={() => setSelectedCell(null)}
      >
        {selectedCell ? (
          <div className={styles.dayDetailsModal}>
            <div className={styles.dayDetailsSummary}>
              <article>
                <span>Entradas</span>
                <strong>{calendar.formatCurrency(selectedCell.totals.entrada)}</strong>
              </article>
              <article>
                <span>Saidas</span>
                <strong>{calendar.formatCurrency(selectedCell.totals.saida)}</strong>
              </article>
            </div>

            <section className={styles.dayDetailsSection}>
              <h3>Entradas</h3>
              {selectedCell.transactions.entrada.length === 0 ? (
                <p className={styles.dayDetailsEmpty}>Nenhuma entrada nesse dia.</p>
              ) : (
                <div className={styles.dayDetailsList}>
                  {selectedCell.transactions.entrada.map((item) => (
                    <article key={item.id} className={styles.dayDetailsItem}>
                      <div>
                        <strong>{item.description}</strong>
                        <span>{item.category}</span>
                      </div>
                      <strong>{calendar.formatCurrency(item.amount)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.dayDetailsSection}>
              <h3>Saidas</h3>
              {selectedCell.transactions.saida.length === 0 ? (
                <p className={styles.dayDetailsEmpty}>Nenhuma saida nesse dia.</p>
              ) : (
                <div className={styles.dayDetailsList}>
                  {selectedCell.transactions.saida.map((item) => (
                    <article key={item.id} className={styles.dayDetailsItem}>
                      <div>
                        <strong>{item.description}</strong>
                        <span>{item.category}</span>
                      </div>
                      <strong>{calendar.formatCurrency(item.amount)}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </ModalBase>
    </PageTemplate>
  )
}
