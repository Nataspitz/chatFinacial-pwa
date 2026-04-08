import type { ChangeEvent } from 'react'
import { Button } from '../../../components/ui'
import styles from '../Calendario.module.css'

interface CalendarToolbarProps {
  currentMonth: Date
  availableYears: number[]
  onPreviousMonth: () => void
  onNextMonth: () => void
  onYearChange: (event: ChangeEvent<HTMLSelectElement>) => void
  formatMonthTitle: (date: Date) => string
}

export const CalendarToolbar = ({
  currentMonth,
  availableYears,
  onPreviousMonth,
  onNextMonth,
  onYearChange,
  formatMonthTitle
}: CalendarToolbarProps): JSX.Element => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.monthNav}>
        <Button variant="ghost" className={styles.monthButton} onClick={onPreviousMonth} aria-label="Mês anterior">
          {'<'}
        </Button>
        <strong className={styles.monthTitle}>{formatMonthTitle(currentMonth)}</strong>
        <Button variant="ghost" className={styles.monthButton} onClick={onNextMonth} aria-label="Próximo mês">
          {'>'}
        </Button>
      </div>
      <select className={styles.yearSelect} aria-label="Ano" value={currentMonth.getFullYear()} onChange={onYearChange}>
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}
