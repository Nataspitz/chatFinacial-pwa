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
}

export interface AuditSliceCardItem {
  key: string
  sliceLabel: string
  periodLabel: string
  unlockLabel: string
  statusLabel: string
  tone: Extract<HistoryStateTone, 'pending' | 'confirmed'>
}

export const APRIL_2026 = '2026-04-01'
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

export const buildSlicesForMonth = (monthRef: string): SlicePlan[] => {
  const normalized = normalizeDate(monthRef)
  const [year, month] = normalized.split('-').map(Number)
  const lastDay = new Date(year, month, 0)
  const date = (day: number): string =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return [
    {
      auditSlice: 1,
      periodStart: date(1),
      periodEnd: date(10),
      unlockAt: date(10)
    },
    {
      auditSlice: 2,
      periodStart: date(11),
      periodEnd: date(20),
      unlockAt: date(20)
    },
    {
      auditSlice: 3,
      periodStart: date(21),
      periodEnd: date(lastDay.getDate()),
      unlockAt: date(lastDay.getDate())
    }
  ]
}

export const mapAuditSlices = (audits: FinancialAudit[]): AuditSliceCardItem[] =>
  audits
    .slice()
    .sort((a, b) => a.auditSlice - b.auditSlice)
    .map((item) => ({
      key: `${item.monthRef}-${item.auditSlice}`,
      sliceLabel: `${item.auditSlice}/3`,
      periodLabel: `${formatDate(item.periodStart)} até ${formatDate(item.periodEnd)}`,
      unlockLabel: formatDate(item.unlockAt),
      statusLabel: item.status === 'confirmed' ? 'Confirmada' : 'Pendente',
      tone: item.status === 'confirmed' ? 'confirmed' : 'pending'
    }))

export const mapUpcomingMandatorySlices = (mandatoryMonth: string): AuditSliceCardItem[] =>
  buildSlicesForMonth(mandatoryMonth).map((slice) => ({
    key: `${mandatoryMonth}-${slice.auditSlice}`,
    sliceLabel: `${slice.auditSlice}/3`,
    periodLabel: `${formatDate(slice.periodStart)} até ${formatDate(slice.periodEnd)}`,
    unlockLabel: formatDate(slice.unlockAt),
    statusLabel: 'Obrigatória',
    tone: 'pending'
  }))

export const buildAuditHistory = (historyAudits: FinancialAudit[]): HistoryMonthItem[] => {
  const groups = new Map<string, FinancialAudit[]>()

  historyAudits.forEach((audit) => {
    const key = normalizeDate(audit.monthRef)
    const current = groups.get(key) ?? []
    current.push(audit)
    groups.set(key, current)
  })

  if (!groups.has(APRIL_2026)) {
    groups.set(APRIL_2026, [])
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([monthRef, rows]) => {
      if (monthRef === APRIL_2026 && rows.length === 0) {
        return {
          monthRef,
          tone: 'skipped',
          label: 'Pulado',
          detail: 'Mês inicial pulado por regra de implantação.',
          confirmedCount: 0,
          totalCount: 0
        }
      }

      const totalCount = rows.length
      const confirmedCount = rows.filter((item) => item.status === 'confirmed').length

      if (confirmedCount === 0) {
        return {
          monthRef,
          tone: 'pending',
          label: 'Pendente',
          detail: 'Sem faixas confirmadas.',
          confirmedCount,
          totalCount
        }
      }

      if (confirmedCount < totalCount) {
        return {
          monthRef,
          tone: 'partial',
          label: 'Parcial',
          detail: `${confirmedCount} de ${totalCount} faixas confirmadas.`,
          confirmedCount,
          totalCount
        }
      }

      return {
        monthRef,
        tone: 'confirmed',
        label: 'Concluída',
        detail: 'Todas as faixas confirmadas.',
        confirmedCount,
        totalCount
      }
    })
}
