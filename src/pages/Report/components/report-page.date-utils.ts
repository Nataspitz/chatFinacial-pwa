export const normalizeTransactionDate = (value: string): string | null => {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

export const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getCurrentYear = (): string => String(new Date().getFullYear())

export const getCurrentMonth = (): string => String(new Date().getMonth() + 1).padStart(2, '0')

export const formatDate = (value: string): string => {
  const normalized = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!normalized) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
  }

  const [year, month, day] = normalized.split('-').map(Number)
  const localDate = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('pt-BR').format(localDate)
}

export const parseLocalDate = (dateValue: string): Date => {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addMonthsKeepingDay = (baseDate: Date, monthOffset: number): Date => {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = baseDate.getDate()
  const targetFirstDay = new Date(year, month + monthOffset, 1)
  const lastDay = new Date(targetFirstDay.getFullYear(), targetFirstDay.getMonth() + 1, 0).getDate()
  return new Date(targetFirstDay.getFullYear(), targetFirstDay.getMonth(), Math.min(day, lastDay))
}

export const addMonths = (dateValue: string, monthOffset: number): string => {
  const date = parseLocalDate(dateValue)
  const next = addMonthsKeepingDay(date, monthOffset)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

export const getMonthDiff = (fromDate: string, toDate: string): number => {
  const from = parseLocalDate(fromDate)
  const to = parseLocalDate(toDate)
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export const getPreviousDate = (dateValue: string): string => {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const getLastDayOfMonth = (year: string, month: string): string => {
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  return `${year}-${month}-${String(lastDay).padStart(2, '0')}`
}

export const getSortableDateValue = (value: string): number => {
  const iso = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (iso) {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day).getTime()
  }

  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) {
    const [, day, month, year] = br
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}
