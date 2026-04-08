import type { Transaction } from '../../types/transaction.types'

export type DashboardViewMode = 'monthly' | 'annual'

export interface NormalizedTransaction extends Transaction {
  parsedDate: Date
  year: number
  month: number
  day: number
}

export interface PeriodTotals {
  revenue: number
  expense: number
  profit: number
}

export interface CandleDatum {
  x: number
  y: [number, number, number, number]
}

export interface TimePoint {
  label: string
  revenue: number
  expense: number
  profit: number
  year: number
  month: number
}

export interface HealthSnapshot {
  averageProfitLast3: number
  revenueGrowth: number | null
  expenseGrowth: number | null
  trend: 'subindo' | 'descendo' | 'estavel'
  expenseGrowingFaster: boolean | null
}
