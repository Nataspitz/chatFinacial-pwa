export const FINANCIAL_AUDIT_LOCK_MESSAGE =
  'Periodo financeiro ja fechado pela auditoria. Transacoes ate o mes anterior nao podem ser criadas, editadas ou removidas.'

const normalizeDate = (value: string): string | null => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null

const getCurrentMonthStart = (baseDate = new Date()): string => {
  const year = baseDate.getFullYear()
  const month = String(baseDate.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export const getFinancialAuditLockCutoffDate = (baseDate = new Date()): string => getCurrentMonthStart(baseDate)

export const isFinancialPeriodLocked = (dateValue: string, baseDate = new Date()): boolean => {
  const normalizedDate = normalizeDate(dateValue)
  if (!normalizedDate) {
    return false
  }

  return normalizedDate < getFinancialAuditLockCutoffDate(baseDate)
}

export const hasLockedFinancialPeriod = (dateValues: string[], baseDate = new Date()): boolean =>
  dateValues.some((dateValue) => isFinancialPeriodLocked(dateValue, baseDate))

export const assertFinancialPeriodUnlocked = (dateValues: string[], baseDate = new Date()): void => {
  if (hasLockedFinancialPeriod(dateValues, baseDate)) {
    throw new Error(FINANCIAL_AUDIT_LOCK_MESSAGE)
  }
}
