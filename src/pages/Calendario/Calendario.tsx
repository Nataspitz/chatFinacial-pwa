import { LoadingState } from '../../components/organisms/LoadingState/LoadingState'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { CalendarGrid } from './components/CalendarGrid'
import { CalendarToolbar } from './components/CalendarToolbar'
import { MonthSummary } from './components/MonthSummary'
import { PageHeader } from './components/PageHeader'
import { useCalendarData } from './hooks/useCalendarData'
import styles from './Calendario.module.css'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export const Calendario = (): JSX.Element => {
  const calendar = useCalendarData()

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
          weekDays={WEEK_DAYS}
          todayKey={calendar.todayKey}
          formatCurrency={calendar.formatCurrency}
        />
      ) : null}
    </PageTemplate>
  )
}
