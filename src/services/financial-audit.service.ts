import { supabase } from '../lib/supabase'
import type { FinancialAuditLockedPeriod } from './financial-audit-lock'
import type { FinancialAudit, FinancialAuditStatus } from '../types/financial-audit.types'

interface FinancialAuditRow {
  id: string
  user_id: string
  month_ref: string
  audit_slice: number
  period_start: string
  period_end: string
  unlock_at: string
  status: FinancialAuditStatus
  certificate_bucket: string | null
  certificate_path: string | null
  certificate_mime_type: string | null
  certificate_size_bytes: number | null
  confirmed_at: string | null
  confirmed_by: string | null
  created_at: string
  updated_at: string
}

const MANDATORY_AUDIT_START_MONTH = '2026-05-01'
const CERTIFICATE_BUCKET = 'financial-audit-certificates'

const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

const toMonthStart = (dateValue: Date): string => {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

const mapRow = (row: FinancialAuditRow): FinancialAudit => ({
  id: row.id,
  userId: row.user_id,
  monthRef: normalizeDate(row.month_ref),
  auditSlice: Math.min(3, Math.max(1, Number(row.audit_slice))) as 1 | 2 | 3,
  periodStart: normalizeDate(row.period_start),
  periodEnd: normalizeDate(row.period_end),
  unlockAt: normalizeDate(row.unlock_at),
  status: row.status,
  certificateBucket: row.certificate_bucket,
  certificatePath: row.certificate_path,
  certificateMimeType: row.certificate_mime_type,
  certificateSizeBytes: row.certificate_size_bytes ?? null,
  confirmedAt: row.confirmed_at,
  confirmedBy: row.confirmed_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw error
  }

  if (!data.user?.id) {
    throw new Error('Usuario nao autenticado')
  }

  return data.user.id
}

const readCertificatePayload = async (file: File): Promise<Record<string, unknown>> => {
  const text = await file.text()
  let parsed: unknown

  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Certificado invalido. Envie um arquivo JSON valido.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Certificado invalido. Envie um arquivo JSON valido.')
  }

  return parsed as Record<string, unknown>
}

const getPayloadText = (payload: Record<string, unknown>, field: string): string => {
  const value = payload[field]
  return typeof value === 'string' ? normalizeDate(value) : ''
}

const validateCertificatePayload = (
  audit: Pick<FinancialAudit, 'monthRef' | 'auditSlice'>,
  payload: Record<string, unknown>
): void => {
  if (payload.version !== 1) {
    throw new Error('Certificado recusado: campo version invalido.')
  }

  if (getPayloadText(payload, 'month_ref') !== normalizeDate(audit.monthRef)) {
    throw new Error('Certificado recusado: o mes do certificado nao corresponde a auditoria selecionada.')
  }

  if (Number(payload.audit_slice) !== audit.auditSlice) {
    throw new Error('Certificado recusado: a fatia do certificado nao corresponde a auditoria selecionada.')
  }

  if (payload.verdict !== 'approved') {
    throw new Error('Certificado recusado: o parecer precisa estar aprovado.')
  }

  if (!getPayloadText(payload, 'generated_at')) {
    throw new Error('Certificado recusado: campo generated_at ausente.')
  }
}

export const financialAuditService = {
  mandatoryStartMonth: MANDATORY_AUDIT_START_MONTH,

  isMonthMandatory: (monthRef: string): boolean => normalizeDate(monthRef) >= MANDATORY_AUDIT_START_MONTH,

  getActiveMonth: (): string => toMonthStart(new Date()),

  ensureAuditsForMonth: async (monthRef: string): Promise<FinancialAudit[]> => {
    const monthStart = normalizeDate(monthRef)
    const userId = await getUserId()

    const { data, error } = await supabase
      .rpc('ensure_monthly_financial_audits', { p_month: monthStart })
      .select()

    if (error) {
      throw error
    }

    const rows = (data ?? []) as FinancialAuditRow[]
    return rows.filter((row) => row.user_id === userId).map(mapRow)
  },

  getHistory: async (): Promise<FinancialAudit[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_audits')
      .select(
        'id, user_id, month_ref, audit_slice, period_start, period_end, unlock_at, status, certificate_bucket, certificate_path, certificate_mime_type, certificate_size_bytes, confirmed_at, confirmed_by, created_at, updated_at'
      )
      .eq('user_id', userId)
      .order('month_ref', { ascending: false })
      .order('audit_slice', { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as FinancialAuditRow[]).map(mapRow)
  },

  getConfirmedLockedPeriods: async (): Promise<FinancialAuditLockedPeriod[]> => {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('financial_audits')
      .select('period_start, period_end')
      .eq('user_id', userId)
      .eq('status', 'confirmed')

    if (error) {
      throw error
    }

    return ((data ?? []) as Array<Pick<FinancialAuditRow, 'period_start' | 'period_end'>>).map((row) => ({
      startDate: normalizeDate(row.period_start),
      endDate: normalizeDate(row.period_end)
    }))
  },

  confirmAuditSliceWithCertificate: async (audit: Pick<FinancialAudit, 'monthRef' | 'auditSlice'>, file: File): Promise<FinancialAudit> => {
    if (file.type && file.type !== 'application/json') {
      throw new Error('Certificado invalido. Envie um arquivo JSON.')
    }

    const userId = await getUserId()
    const certificatePayload = await readCertificatePayload(file)
    validateCertificatePayload(audit, certificatePayload)
    const certificateMimeType = 'application/json'
    const monthKey = normalizeDate(audit.monthRef).slice(0, 7)
    const certificatePath = `${userId}/${monthKey}/slice-${audit.auditSlice}.json`

    const { error: uploadError } = await supabase.storage
      .from(CERTIFICATE_BUCKET)
      .upload(certificatePath, file, {
        contentType: certificateMimeType,
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Certificado recusado: ${uploadError.message}`)
    }

    const { data, error } = await supabase
      .rpc('confirm_financial_audit_slice', {
        p_month: normalizeDate(audit.monthRef),
        p_audit_slice: audit.auditSlice,
        p_certificate_bucket: CERTIFICATE_BUCKET,
        p_certificate_path: certificatePath,
        p_certificate_mime_type: certificateMimeType,
        p_certificate_size_bytes: file.size,
        p_certificate_payload: certificatePayload
      })
      .single()

    if (error) {
      throw new Error(`Certificado recusado: ${error.message}`)
    }

    return mapRow(data as FinancialAuditRow)
  }
}
