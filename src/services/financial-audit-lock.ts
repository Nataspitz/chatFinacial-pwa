export const FINANCIAL_AUDIT_LOCK_MESSAGE =
  'Período financeiro já fechado pela auditoria. Transações em períodos auditados não podem ser criadas, editadas ou removidas.'

const normalizeDate = (value: string): string | null => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null

export interface FinancialAuditLockedPeriod {
  startDate: string
  endDate: string
}

let confirmedLockedPeriods: FinancialAuditLockedPeriod[] = []

export const setFinancialAuditLockedPeriods = (periods: FinancialAuditLockedPeriod[]): void => {
  confirmedLockedPeriods = periods
    .map((period) => ({
      startDate: normalizeDate(period.startDate) ?? period.startDate,
      endDate: normalizeDate(period.endDate) ?? period.endDate
    }))
    .filter((period) => period.startDate <= period.endDate)
}

export const getFinancialAuditLockedPeriods = (): FinancialAuditLockedPeriod[] => [...confirmedLockedPeriods]

const getCurrentMonthStart = (baseDate = new Date()): string => {
  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

const getNextDate = (dateValue: string): string => {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const getFinancialAuditLockCutoffDate = (baseDate = new Date()): string => {
  let cutoff = getCurrentMonthStart(baseDate)

  confirmedLockedPeriods
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .forEach((period) => {
      if (period.startDate <= cutoff && period.endDate >= cutoff) {
        cutoff = getNextDate(period.endDate)
      }
    })

  return cutoff
}

export const isFinancialPeriodLocked = (dateValue: string, baseDate = new Date()): boolean => {
  const normalizedDate = normalizeDate(dateValue)
  if (!normalizedDate) {
    return false
  }

  return normalizedDate < getFinancialAuditLockCutoffDate(baseDate)
    || confirmedLockedPeriods.some((period) => normalizedDate >= period.startDate && normalizedDate <= period.endDate)
}

export const hasLockedFinancialPeriod = (dateValues: string[], baseDate = new Date()): boolean =>
  dateValues.some((dateValue) => isFinancialPeriodLocked(dateValue, baseDate))

export const assertFinancialPeriodUnlocked = (dateValues: string[], baseDate = new Date()): void => {
  if (hasLockedFinancialPeriod(dateValues, baseDate)) {
    throw new Error(FINANCIAL_AUDIT_LOCK_MESSAGE)
  }
}
