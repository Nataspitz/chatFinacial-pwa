import type { Transaction } from './transaction.types'

export interface ExportReportPdfTransaction extends Transaction {
  dateLabel: string
  amountLabel: string
  totalAmountLabel: string
  paymentMethodLabel: string
  installmentLabel: string
  paymentDetailsLabel: string
}

export interface ExportDashboardMetric {
  label: string
  value: string
}

export interface ExportReportPdfPayload {
  fileName: string
  companyName: string
  createdAt: string
  periodLabel: string
  entries: ExportReportPdfTransaction[]
  outcomes: ExportReportPdfTransaction[]
  totalEntries: number
  totalOutcomes: number
  resultBalance: number
  previousAccountBalance?: number
  currentAccountBalance?: number
  dashboardMetrics: ExportDashboardMetric[]
}

export interface ExportReportPdfResult {
  canceled: boolean
  filePath?: string
}
