import { supabase } from '../lib/supabase'
import type { FinancialMonthlySummary } from '../types/financial-summary.types'

interface FinancialMonthlySummaryRow {
  id: string
  user_id: string
  month_ref: string
  total_entries: number | string
  total_outcomes: number | string
  result_balance: number | string
  account_balance: number | string
  calculated_at: string
  created_at: string
  updated_at: string
}

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const mapRow = (row: FinancialMonthlySummaryRow): FinancialMonthlySummary => ({
  id: row.id,
  userId: row.user_id,
  monthRef: row.month_ref.slice(0, 10),
  totalEntries: toNumber(row.total_entries),
  totalOutcomes: toNumber(row.total_outcomes),
  resultBalance: toNumber(row.result_balance),
  accountBalance: toNumber(row.account_balance),
  calculatedAt: row.calculated_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const financialSummaryService = {
  listYear: async (year: number): Promise<FinancialMonthlySummary[]> => {
    const start = `${year}-01-01`
    const end = `${year}-12-01`

    const { data, error } = await supabase
      .from('financial_monthly_summaries')
      .select('*')
      .gte('month_ref', start)
      .lte('month_ref', end)
      .order('month_ref', { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as FinancialMonthlySummaryRow[]).map(mapRow)
  },

  refreshYear: async (year: number): Promise<FinancialMonthlySummary[]> => {
    const { data, error } = await supabase.rpc('refresh_financial_monthly_summaries', {
      p_year: year
    })

    if (error) {
      throw error
    }

    return ((data ?? []) as FinancialMonthlySummaryRow[]).map(mapRow)
  }
}
