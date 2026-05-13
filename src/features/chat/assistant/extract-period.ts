import type { AssistantPeriod } from './types'
import { normalizeText } from './normalize-text'
import { addDays, addMonths, endOfMonth, endOfWeek, localDateToDateOnly, startOfMonth, startOfWeek } from './date-utils'

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11
}

const MONTH_LABELS: Record<string, string> = {
  marco: 'março'
}

const getMonthLabel = (month: string): string => MONTH_LABELS[month] ?? month

const parseBrDate = (value: string, referenceDate: Date): Date | null => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2]) - 1
  const year = match[3] ? Number(match[3]) : referenceDate.getFullYear()
  const date = new Date(year, month, day)

  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
}

const toSingleDay = (date: Date, label: string): AssistantPeriod => ({
  start: localDateToDateOnly(date),
  end: localDateToDateOnly(date),
  label
})

const toRange = (start: Date, end: Date, label: string): AssistantPeriod => ({
  start: localDateToDateOnly(start),
  end: localDateToDateOnly(end),
  label
})

export const extractPeriod = (message: string, referenceDate = new Date()): AssistantPeriod | null => {
  const text = normalizeText(message)

  const explicitRange = text.match(/(?:de\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:ate|a|-)\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
  if (explicitRange?.[1] && explicitRange[2]) {
    const start = parseBrDate(explicitRange[1], referenceDate)
    const end = parseBrDate(explicitRange[2], referenceDate)
    if (start && end) return toRange(start, end, `${explicitRange[1]} até ${explicitRange[2]}`)
  }

  const fullDate = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/)
  if (fullDate?.[1]) {
    const date = parseBrDate(fullDate[1], referenceDate)
    if (date) return toSingleDay(date, fullDate[1])
  }

  if (text.includes('hoje')) return toSingleDay(referenceDate, 'hoje')
  if (text.includes('ontem')) return toSingleDay(addDays(referenceDate, -1), 'ontem')

  if (text.includes('mes passado')) {
    const date = addMonths(referenceDate, -1)
    return toRange(startOfMonth(date), endOfMonth(date), 'mês passado')
  }
  if (text.includes('mes que vem')) {
    const date = addMonths(referenceDate, 1)
    return toRange(startOfMonth(date), endOfMonth(date), 'mês que vem')
  }
  if (text.includes('esse mes') || text.includes('este mes') || text.includes('mes atual')) {
    return toRange(startOfMonth(referenceDate), endOfMonth(referenceDate), 'este mês')
  }

  if (text.includes('semana passada')) {
    const date = addDays(referenceDate, -7)
    return toRange(startOfWeek(date), endOfWeek(date), 'semana passada')
  }
  if (text.includes('essa semana') || text.includes('esta semana')) {
    return toRange(startOfWeek(referenceDate), endOfWeek(referenceDate), 'esta semana')
  }

  if (text.includes('ano passado')) {
    const year = referenceDate.getFullYear() - 1
    return toRange(new Date(year, 0, 1), new Date(year, 11, 31), 'ano passado')
  }
  if (text.includes('esse ano') || text.includes('este ano')) {
    const year = referenceDate.getFullYear()
    return toRange(new Date(year, 0, 1), new Date(year, 11, 31), 'este ano')
  }

  const monthNames = Object.keys(MONTHS).join('|')
  const dayMonth = text.match(new RegExp(`(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${monthNames})(?:\\s+de\\s+(\\d{4}))?`))
  if (dayMonth?.[1] && dayMonth[2]) {
    const day = Number(dayMonth[1])
    const month = MONTHS[dayMonth[2]]
    const year = dayMonth[3] ? Number(dayMonth[3]) : referenceDate.getFullYear()
    const date = new Date(year, month, day)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return toSingleDay(date, `dia ${day} de ${getMonthLabel(dayMonth[2])} de ${year}`)
    }
  }

  const monthYear = text.match(new RegExp(`\\b(${monthNames})\\s+(?:de\\s+)?(\\d{4})\\b`))
  if (monthYear?.[1] && monthYear[2]) {
    const month = MONTHS[monthYear[1]]
    const year = Number(monthYear[2])
    const date = new Date(year, month, 1)
    return toRange(startOfMonth(date), endOfMonth(date), `${getMonthLabel(monthYear[1])} de ${year}`)
  }

  const dayOnly = text.match(/\bdia\s+(\d{1,2})\b/)
  if (dayOnly?.[1]) {
    const day = Number(dayOnly[1])
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day)
    if (date.getDate() === day) return toSingleDay(date, `dia ${day}`)
  }

  return null
}
