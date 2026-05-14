import type { AssistantPeriod } from '../types'
import { normalizeText } from '../core/normalizeText'
import { addDays, addMonths, endOfMonth, endOfWeek, localDateToDateOnly, startOfMonth, startOfWeek } from '../date-utils'
import { monthDisplayByName, monthIndexByName, relativeDateTerms } from '../vocabulary/dates.vocabulary'

const monthNamesRegex = Object.keys(monthIndexByName).join('|')

const parseMonthName = (month: string): number | null => {
  const index = monthIndexByName[month]
  return Number.isInteger(index) ? index : null
}

const toLabelMonth = (month: string): string => monthDisplayByName[month] ?? month

const parseBrDate = (raw: string, referenceDate: Date): Date | null => {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2]) - 1
  const year = match[3] ? Number(match[3]) : referenceDate.getFullYear()
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

const fromSingleDate = (date: Date, label: string): AssistantPeriod => ({
  start: localDateToDateOnly(date),
  end: localDateToDateOnly(date),
  label
})

const fromRange = (start: Date, end: Date, label: string): AssistantPeriod => ({
  start: localDateToDateOnly(start),
  end: localDateToDateOnly(end),
  label
})

const parseDayMonthYear = (
  dayRaw: string,
  monthRaw: string | undefined,
  yearRaw: string | undefined,
  referenceDate: Date
): Date | null => {
  const day = Number(dayRaw)
  const month = monthRaw ? parseMonthName(monthRaw) : referenceDate.getMonth()
  const year = yearRaw ? Number(yearRaw) : referenceDate.getFullYear()
  if (month === null) return null
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

export const extractDatePeriod = (message: string, referenceDate = new Date()): AssistantPeriod | null => {
  const text = normalizeText(message)
  if (!text) return null

  const explicitRange = text.match(
    /(?:de\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*(?:ate|a|-)\s*(\d{1,2}\/\d{1,2}(?:\/\d{4})?)/
  )
  if (explicitRange?.[1] && explicitRange[2]) {
    const start = parseBrDate(explicitRange[1], referenceDate)
    const end = parseBrDate(explicitRange[2], referenceDate)
    if (start && end) return fromRange(start, end, `${explicitRange[1]} até ${explicitRange[2]}`)
  }

  const dayRangeByMonth = text.match(
    new RegExp(
      `do\\s+dia\\s+(\\d{1,2})\\s+(?:de\\s+(${monthNamesRegex}))?\\s+a(?:te)?\\s+dia\\s+(\\d{1,2})\\s+(?:de\\s+(${monthNamesRegex}))?(?:\\s+de\\s+(\\d{4}))?`
    )
  )
  if (dayRangeByMonth?.[1] && dayRangeByMonth[3]) {
    const startDate = parseDayMonthYear(dayRangeByMonth[1], dayRangeByMonth[2], dayRangeByMonth[5], referenceDate)
    const endDate = parseDayMonthYear(dayRangeByMonth[3], dayRangeByMonth[4] ?? dayRangeByMonth[2], dayRangeByMonth[5], referenceDate)
    if (startDate && endDate) {
      return fromRange(startDate, endDate, `do dia ${dayRangeByMonth[1]} ao dia ${dayRangeByMonth[3]}`)
    }
  }

  const monthUntilDay = text.match(new RegExp(`(${monthNamesRegex})(?:\\s+de\\s+(\\d{4}))?\\s+ate\\s+dia\\s+(\\d{1,2})`))
  if (monthUntilDay?.[1] && monthUntilDay[3]) {
    const month = parseMonthName(monthUntilDay[1])
    const year = monthUntilDay[2] ? Number(monthUntilDay[2]) : referenceDate.getFullYear()
    if (month !== null) {
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month, Number(monthUntilDay[3]))
      if (endDate.getMonth() === month) {
        return fromRange(startDate, endDate, `${toLabelMonth(monthUntilDay[1])} de ${year} até dia ${monthUntilDay[3]}`)
      }
    }
  }

  const isoOrBrDay = text.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\b/)
  if (isoOrBrDay?.[1]) {
    const day = parseBrDate(isoOrBrDay[1], referenceDate)
    if (day) return fromSingleDate(day, isoOrBrDay[1])
  }

  if (relativeDateTerms.today.some((term) => text.includes(term))) return fromSingleDate(referenceDate, 'hoje')
  if (relativeDateTerms.yesterday.some((term) => text.includes(term))) return fromSingleDate(addDays(referenceDate, -1), 'ontem')
  if (relativeDateTerms.last7Days.some((term) => text.includes(term))) {
    return fromRange(addDays(referenceDate, -6), referenceDate, 'últimos 7 dias')
  }
  if (relativeDateTerms.lastMonth.some((term) => text.includes(term))) {
    const lastMonth = addMonths(referenceDate, -1)
    return fromRange(startOfMonth(lastMonth), endOfMonth(lastMonth), 'mês passado')
  }
  if (relativeDateTerms.nextMonth.some((term) => text.includes(term))) {
    const nextMonth = addMonths(referenceDate, 1)
    return fromRange(startOfMonth(nextMonth), endOfMonth(nextMonth), 'próximo mês')
  }
  if (relativeDateTerms.thisMonth.some((term) => text.includes(term))) {
    return fromRange(startOfMonth(referenceDate), endOfMonth(referenceDate), 'este mês')
  }
  if (relativeDateTerms.lastWeek.some((term) => text.includes(term))) {
    const lastWeekDate = addDays(referenceDate, -7)
    return fromRange(startOfWeek(lastWeekDate), endOfWeek(lastWeekDate), 'semana passada')
  }
  if (relativeDateTerms.thisWeek.some((term) => text.includes(term))) {
    return fromRange(startOfWeek(referenceDate), endOfWeek(referenceDate), 'esta semana')
  }
  if (relativeDateTerms.lastYear.some((term) => text.includes(term))) {
    const year = referenceDate.getFullYear() - 1
    return fromRange(new Date(year, 0, 1), new Date(year, 11, 31), 'ano passado')
  }
  if (relativeDateTerms.thisYear.some((term) => text.includes(term))) {
    const year = referenceDate.getFullYear()
    return fromRange(new Date(year, 0, 1), new Date(year, 11, 31), 'este ano')
  }

  const dayMonthYear = text.match(
    new RegExp(`(?:dia\\s+)?(\\d{1,2})(?:\\s+de\\s+(${monthNamesRegex})(?:\\s+de\\s+(\\d{4}))?)`)
  )
  if (dayMonthYear?.[1] && dayMonthYear[2]) {
    const date = parseDayMonthYear(dayMonthYear[1], dayMonthYear[2], dayMonthYear[3], referenceDate)
    if (date) {
      const year = dayMonthYear[3] ? Number(dayMonthYear[3]) : referenceDate.getFullYear()
      return fromSingleDate(date, `dia ${dayMonthYear[1]} de ${toLabelMonth(dayMonthYear[2])} de ${year}`)
    }
  }

  const monthYear = text.match(new RegExp(`\\b(${monthNamesRegex})(?:\\s+de\\s+(\\d{4}))?\\b`))
  if (monthYear?.[1]) {
    const month = parseMonthName(monthYear[1])
    const year = monthYear[2] ? Number(monthYear[2]) : referenceDate.getFullYear()
    if (month !== null) {
      const monthDate = new Date(year, month, 1)
      return fromRange(startOfMonth(monthDate), endOfMonth(monthDate), `${toLabelMonth(monthYear[1])} de ${year}`)
    }
  }

  const dayOnly = text.match(/\bdia\s+(\d{1,2})\b/)
  if (dayOnly?.[1]) {
    const date = parseDayMonthYear(dayOnly[1], undefined, undefined, referenceDate)
    if (date) return fromSingleDate(date, `dia ${dayOnly[1]}`)
  }

  return null
}
