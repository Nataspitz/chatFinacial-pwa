import type { FinancialAudit } from '../../types/financial-audit.types'

export interface SlicePlan {
  auditSlice: 1 | 2 | 3
  periodStart: string
  periodEnd: string
  unlockAt: string
}

export type HistoryStateTone = 'pending' | 'confirmed' | 'partial' | 'skipped'

export interface HistoryMonthItem {
  monthRef: string
  tone: HistoryStateTone
  label: string
  detail: string
  confirmedCount: number
  totalCount: number
  slices: HistorySliceItem[]
}

export interface HistorySliceItem {
  key: string
  auditSlice: 1 | 2 | 3
  periodLabel: string
  statusLabel: string
  tone: Extract<HistoryStateTone, 'pending' | 'confirmed'>
  certificateLabel: string
}

export interface AuditSliceCardItem {
  key: string
  monthRef: string
  auditSlice: 1 | 2 | 3
  sliceLabel: string
  periodLabel: string
  unlockLabel: string
  statusLabel: string
  tone: Extract<HistoryStateTone, 'pending' | 'confirmed'>
  status: FinancialAudit['status']
  canUploadCertificate: boolean
}

export const AUDITOR_AGENT_URL = 'https://chatgpt.com/g/g-69ee3a17ba28819189e965fe55a2e163-chatfinancial-auditor'

export const normalizeDate = (value: string): string => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

export const formatDate = (value: string): string => {
  const normalized = normalizeDate(value)
  const [year, month, day] = normalized.split('-').map(Number)
  const local = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('pt-BR').format(local)
}

export const formatMonthLabel = (monthRef: string): string => {
  const normalized = normalizeDate(monthRef)
  const [year, month] = normalized.split('-').map(Number)
  const local = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(local)
}

const getTodayDate = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const buildSlicesForMonth = (monthRef: string): SlicePlan[] => {
  const normalized = normalizeDate(monthRef)
  const [year, month] = normalized.split('-').map(Number)
  const lastDay = new Date(year, month, 0)
  const nextMonthFirstDay = new Date(year, month, 1)
  const date = (day: number): string =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const formatLocalDate = (value: Date): string =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

  return [
    {
      auditSlice: 1,
      periodStart: date(1),
      periodEnd: date(10),
      unlockAt: date(11)
    },
    {
      auditSlice: 2,
      periodStart: date(11),
      periodEnd: date(20),
      unlockAt: date(21)
    },
    {
      auditSlice: 3,
      periodStart: date(21),
      periodEnd: date(lastDay.getDate()),
      unlockAt: formatLocalDate(nextMonthFirstDay)
    }
  ]
}

export const mapAuditSlices = (audits: FinancialAudit[]): AuditSliceCardItem[] =>
  audits
    .slice()
    .sort((a, b) => a.auditSlice - b.auditSlice)
    .map((item) => ({
      key: `${item.monthRef}-${item.auditSlice}`,
      monthRef: item.monthRef,
      auditSlice: item.auditSlice,
      sliceLabel: `${item.auditSlice}/3`,
      periodLabel: `${formatDate(item.periodStart)} ate ${formatDate(item.periodEnd)}`,
      unlockLabel: formatDate(item.unlockAt),
      statusLabel: item.status === 'confirmed' ? 'Confirmada' : 'Pendente',
      tone: item.status === 'confirmed' ? 'confirmed' : 'pending',
      status: item.status,
      canUploadCertificate: item.status === 'pending' && normalizeDate(item.unlockAt) <= getTodayDate()
    }))

export const mapUpcomingMandatorySlices = (mandatoryMonth: string): AuditSliceCardItem[] =>
  buildSlicesForMonth(mandatoryMonth).map((slice) => ({
    key: `${mandatoryMonth}-${slice.auditSlice}`,
    monthRef: mandatoryMonth,
    auditSlice: slice.auditSlice,
    sliceLabel: `${slice.auditSlice}/3`,
    periodLabel: `${formatDate(slice.periodStart)} ate ${formatDate(slice.periodEnd)}`,
    unlockLabel: formatDate(slice.unlockAt),
    statusLabel: 'Obrigatoria',
    tone: 'pending',
    status: 'pending',
    canUploadCertificate: false
  }))

export const buildAuditHistory = (historyAudits: FinancialAudit[]): HistoryMonthItem[] => {
  const groups = new Map<string, FinancialAudit[]>()

  historyAudits.forEach((audit) => {
    const key = normalizeDate(audit.monthRef)
    const current = groups.get(key) ?? []
    current.push(audit)
    groups.set(key, current)
  })

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([monthRef, rows]) => {
      const slices = rows
        .slice()
        .sort((a, b) => a.auditSlice - b.auditSlice)
        .map((audit): HistorySliceItem => ({
          key: `${audit.monthRef}-${audit.auditSlice}`,
          auditSlice: audit.auditSlice,
          periodLabel: `${formatDate(audit.periodStart)} ate ${formatDate(audit.periodEnd)}`,
          statusLabel: audit.status === 'confirmed' ? 'Certificado enviado' : 'Pendente',
          tone: audit.status === 'confirmed' ? 'confirmed' : 'pending',
          certificateLabel: audit.certificatePath ? `Arquivo: ${audit.certificatePath.split('/').pop() ?? audit.certificatePath}` : 'Sem certificado'
        }))
      const totalCount = rows.length
      const confirmedCount = rows.filter((item) => item.status === 'confirmed').length

      if (confirmedCount === 0) {
        return {
          monthRef,
          tone: 'pending',
          label: 'Pendente',
          detail: 'Sem faixas confirmadas.',
          confirmedCount,
          totalCount,
          slices
        }
      }

      if (confirmedCount < totalCount) {
        return {
          monthRef,
          tone: 'partial',
          label: 'Parcial',
          detail: `${confirmedCount} de ${totalCount} faixas confirmadas.`,
          confirmedCount,
          totalCount,
          slices
        }
      }

      return {
        monthRef,
        tone: 'confirmed',
        label: 'Concluida',
        detail: 'Todas as faixas confirmadas.',
        confirmedCount,
        totalCount,
        slices
      }
    })
}
