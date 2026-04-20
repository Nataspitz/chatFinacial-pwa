import type { Transaction } from '../../types/transaction.types'

export interface DayTotals {
  entrada: number
  saida: number
}

export interface DayTransactions {
  entrada: Transaction[]
  saida: Transaction[]
}

export interface CalendarCell {
  key: string
  date: Date
  isCurrentMonth: boolean
  totals: DayTotals
  transactions: DayTransactions
}
