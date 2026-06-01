import type { PaymentMethod, Transaction, TransactionType } from '../../../types/transaction.types'

export interface CreateFormState {
  type: Transaction['type']
  amount: string
  date: string
  category: string
  description: string
  isMonthlyCost: boolean
  paymentMethod: PaymentMethod
  installmentCount: number
  cashPlanningGoalId: string
}

export interface ExportFormState {
  fileName: string
  periodType: 'year' | 'month' | 'day' | 'monthRange'
  year: string
  month: string
  day: string
  startDay: string
  endDay: string
}

export interface ListFilterState {
  operationType: 'all' | TransactionType
  maxAmountLimit: string
}

export interface CombinedFilterDraftState extends ListFilterState {
  selectedYear: string
  selectedMonth: string
  selectedDay: string
}

export const MONTH_LABELS: Record<string, string> = {
  all: 'Todos os meses',
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
}
