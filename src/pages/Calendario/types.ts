export interface DayTotals {
  entrada: number
  saida: number
}

export interface CalendarCell {
  key: string
  date: Date
  isCurrentMonth: boolean
  totals: DayTotals
}
