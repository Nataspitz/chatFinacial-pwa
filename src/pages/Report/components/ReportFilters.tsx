import styles from '../Report.module.css'
import { SelectField } from '../../../components/molecules/SelectField/SelectField'

const MONTH_OPTIONS = [
  { value: 'all', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Marco' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
]

interface ReportFiltersProps {
  selectedYear: string
  selectedMonth: string
  selectedDay: string
  yearOptions: string[]
  dayOptions: string[]
  onYearChange: (value: string) => void
  onMonthChange: (value: string) => void
  onDayChange: (value: string) => void
}

export const ReportFilters = ({
  selectedYear,
  selectedMonth,
  selectedDay,
  yearOptions,
  dayOptions,
  onYearChange,
  onMonthChange,
  onDayChange
}: ReportFiltersProps): JSX.Element => {
  return (
    <div className={styles.filters}>
      <SelectField label="Ano" value={selectedYear} onChange={(event) => onYearChange(event.target.value)}>
        <option value="all">Todos os anos</option>
        {yearOptions
          .filter((year) => year !== 'all')
          .map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
      </SelectField>

      <SelectField label="Mes" value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
        {MONTH_OPTIONS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </SelectField>

      <SelectField label="Dia" value={selectedDay} onChange={(event) => onDayChange(event.target.value)}>
        <option value="all">Todos os dias</option>
        {dayOptions
          .filter((day) => day !== 'all')
          .map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
      </SelectField>
    </div>
  )
}
