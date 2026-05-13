import styles from '../Calendario.module.css'
import type { CalendarCell } from '../types'

interface CalendarGridProps {
  cells: CalendarCell[]
  selectedDateKey: string | null
  weekDays: string[]
  todayKey: string
  formatCurrency: (value: number) => string
  onSelectDate: (cell: CalendarCell) => void
}

export const CalendarGrid = ({
  cells,
  selectedDateKey,
  weekDays,
  todayKey,
  formatCurrency,
  onSelectDate
}: CalendarGridProps): JSX.Element => {
  return (
    <div className={styles.calendarWrap}>
      <div className={styles.calendar}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}

        {cells.map((cell) => (
          <article
            key={cell.key}
            data-date={cell.key}
            className={[
              cell.isCurrentMonth ? styles.dayCell : styles.dayCellMuted,
              cell.key === todayKey ? styles.todayCell : '',
              cell.key === selectedDateKey ? styles.selectedCell : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectDate(cell)}
          >
            <span className={styles.dayNumber}>{cell.date.getDate()}</span>
            {cell.totals.entrada > 0 && <span className={styles.entrada}>Entradas: {formatCurrency(cell.totals.entrada)}</span>}
            {cell.totals.saida > 0 && <span className={styles.saida}>Saídas: {formatCurrency(cell.totals.saida)}</span>}
          </article>
        ))}
      </div>
    </div>
  )
}
