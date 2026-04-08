import styles from '../Calendario.module.css'
import type { CalendarCell } from '../types'

interface CalendarGridProps {
  cells: CalendarCell[]
  weekDays: string[]
  todayKey: string
  formatCurrency: (value: number) => string
}

export const CalendarGrid = ({ cells, weekDays, todayKey, formatCurrency }: CalendarGridProps): JSX.Element => {
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
              cell.key === todayKey ? styles.todayCell : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.dayNumber}>{cell.date.getDate()}</span>
            {cell.totals.entrada > 0 && <span className={styles.entrada}>Entradas: {formatCurrency(cell.totals.entrada)}</span>}
            {cell.totals.saida > 0 && <span className={styles.saida}>Saidas: {formatCurrency(cell.totals.saida)}</span>}
          </article>
        ))}
      </div>
    </div>
  )
}
