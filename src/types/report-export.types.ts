import type { Transaction } from './transaction.types'

export interface ExportDashboardMetric {
  label: string
  value: string
}

export interface ExportReportPdfPayload {
  fileName: string
  companyName: string
  createdAt: string
  periodLabel: string
  entries: Transaction[]
  outcomes: Transaction[]
  totalEntries: number
  totalOutcomes: number
  resultBalance: number
  dashboardMetrics: ExportDashboardMetric[]
}

export interface ExportReportPdfResult {
  canceled: boolean
  filePath?: string
}
