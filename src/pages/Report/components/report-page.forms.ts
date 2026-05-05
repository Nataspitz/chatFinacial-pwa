import type { Transaction } from '../../../types/transaction.types'
import type { CombinedFilterDraftState, CreateFormState, ExportFormState, ListFilterState } from './report-page.types'
import { getCurrentMonth, getCurrentYear, getTodayDate } from './report-page.date-utils'

export const initialCreateFormState: CreateFormState = {
  type: 'saida',
  amount: '',
  date: getTodayDate(),
  category: '',
  description: '',
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentCount: 1
}

export const initialExportFormState: ExportFormState = {
  fileName: 'relatorio-financeiro',
  periodType: 'month',
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1).padStart(2, '0'),
  day: String(new Date().getDate()).padStart(2, '0')
}

export const initialListFilterState: ListFilterState = {
  operationType: 'all',
  maxAmountLimit: ''
}

export const initialCombinedFilterDraftState = (): CombinedFilterDraftState => ({
  selectedYear: getCurrentYear(),
  selectedMonth: getCurrentMonth(),
  selectedDay: 'all',
  operationType: 'all',
  maxAmountLimit: ''
})

export const buildCreateFormFromTransaction = (transaction: Transaction): CreateFormState => ({
  type: transaction.type,
  amount: String(transaction.amount),
  date: transaction.date,
  category: transaction.category,
  description: `${transaction.description} (cópia)`,
  isMonthlyCost: transaction.isMonthlyCost,
  paymentMethod: transaction.paymentMethod,
  installmentCount: transaction.paymentMethod === 'credito' ? Math.max(1, transaction.installmentCount) : 1
})
