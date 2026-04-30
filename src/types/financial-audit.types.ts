export type FinancialAuditStatus = 'pending' | 'confirmed'

export interface FinancialAudit {
  id: string
  userId: string
  monthRef: string
  auditSlice: 1 | 2 | 3
  periodStart: string
  periodEnd: string
  unlockAt: string
  status: FinancialAuditStatus
  certificateBucket: string | null
  certificatePath: string | null
  certificateMimeType: string | null
  certificateSizeBytes: number | null
  confirmedAt: string | null
  confirmedBy: string | null
  createdAt: string
  updatedAt: string
}
