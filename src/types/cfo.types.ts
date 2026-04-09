export type CfoAlertSeverity = 'info' | 'warning' | 'critical'

export type CfoAlertCode =
  | 'negative_profit'
  | 'expense_over_revenue'
  | 'expense_growth_over_revenue_growth'
  | 'downward_profit_trend'
  | 'negative_forecast_balance'
  | 'high_future_commitment'

export interface CfoAlert {
  code: CfoAlertCode
  title: string
  description: string
  severity: CfoAlertSeverity
}

export interface CfoTotals {
  revenue: number
  expense: number
  profit: number
  margin: number | null
}

export interface CfoGrowth {
  revenue: number | null
  expense: number | null
  profit: number | null
}

export interface CfoCategoryTotal {
  category: string
  amount: number
}

export interface CfoForecastPoint {
  date: string
  balance: number
}

export interface CfoForecast {
  days: number
  startingBalance: number
  estimatedEndingBalance: number
  estimatedRevenue: number
  estimatedExpense: number
  points: CfoForecastPoint[]
}

export interface CfoFinancialSnapshot {
  generatedAt: string
  period: {
    year: number
    month: number
    label: string
  }
  totals: CfoTotals
  growth: CfoGrowth
  alerts: CfoAlert[]
  topExpenseCategories: CfoCategoryTotal[]
  topRevenueCategories: CfoCategoryTotal[]
  forecast: CfoForecast
  metadata: {
    transactionCount: number
    futureTransactionCount: number
  }
}

export interface CfoAssistantReply {
  source: 'local' | 'remote'
  message: string
  snapshot: CfoFinancialSnapshot
}

export type CfoAnalysisType =
  | 'horizontal'
  | 'vertical'
  | 'liquidity'
  | 'profitability'
  | 'debt'
  | 'break_even'
  | 'cash_flow'
  | 'benchmarking'
  | 'credit_5c'
  | 'fpa'
