import type { NormalizedTransaction, CandleDatum, PeriodTotals, TimePoint } from './types'

export const parseTransactionDate = (value: string): Date | null => {
  const normalized = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (normalized) {
    const [year, month, day] = normalized.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

export const calculatePeriodTotals = (transactions: NormalizedTransaction[]): PeriodTotals => {
  const revenue = transactions
    .filter((item) => item.type === 'entrada')
    .reduce((acc, item) => acc + item.amount, 0)

  const expense = transactions
    .filter((item) => item.type === 'saida')
    .reduce((acc, item) => acc + item.amount, 0)

  return {
    revenue,
    expense,
    profit: revenue - expense
  }
}

export const calculateMonthlyProfit = (
  transactions: NormalizedTransaction[],
  year: number,
  month: number
): number => {
  const monthly = transactions.filter((item) => item.year === year && item.month === month)
  return calculatePeriodTotals(monthly).profit
}

export const calculateAnnualProfit = (transactions: NormalizedTransaction[], year: number): number => {
  const annual = transactions.filter((item) => item.year === year)
  return calculatePeriodTotals(annual).profit
}

export const calculateMargin = (revenue: number, profit: number): number | null => {
  if (revenue <= 0) {
    return null
  }

  return (profit / revenue) * 100
}

export const calculateGrowthPercent = (current: number, previous: number): number | null => {
  if (previous === 0) {
    if (current === 0) {
      return 0
    }

    return null
  }

  return ((current - previous) / Math.abs(previous)) * 100
}

export const calculateMovingAverage = (values: number[], windowSize: number): number | null => {
  if (windowSize <= 0 || values.length < windowSize) {
    return null
  }

  const windowValues = values.slice(values.length - windowSize)
  const sum = windowValues.reduce((acc, value) => acc + value, 0)
  return sum / windowSize
}

export const calculateAccumulatedProfit = (transactions: NormalizedTransaction[]): number => {
  const ordered = [...transactions].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
  return ordered.reduce((acc, item) => acc + (item.type === 'entrada' ? item.amount : -item.amount), 0)
}

export const calculateRoi = (accumulatedProfit: number, investmentAmount: number | null): number | null => {
  if (!investmentAmount || investmentAmount <= 0) {
    return null
  }

  return (accumulatedProfit / investmentAmount) * 100
}

const toDailyNet = (transactions: NormalizedTransaction[]): Map<string, number> => {
  const map = new Map<string, number>()

  transactions.forEach((item) => {
    const key = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
    const signal = item.type === 'entrada' ? 1 : -1
    map.set(key, (map.get(key) ?? 0) + signal * item.amount)
  })

  return map
}

export const buildAnnualCandles = (transactions: NormalizedTransaction[], year: number): CandleDatum[] => {
  const annual = transactions.filter((item) => item.year === year)
  const dailyNet = toDailyNet(annual)
  const candles: CandleDatum[] = []
  let running = 0

  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const open = running
    let high = open
    let low = open

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const net = dailyNet.get(key) ?? 0
      running += net
      high = Math.max(high, running)
      low = Math.min(low, running)
    }

    candles.push({
      x: new Date(year, month - 1, 1).getTime(),
      y: [open, high, low, running]
    })
  }

  return candles
}

export const buildMonthlyCandles = (
  transactions: NormalizedTransaction[],
  year: number,
  month: number
): CandleDatum[] => {
  const monthly = transactions.filter((item) => item.year === year && item.month === month)
  const dailyNet = toDailyNet(monthly)
  const candles: CandleDatum[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  let running = 0

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const open = running
    running += dailyNet.get(key) ?? 0
    const high = Math.max(open, running)
    const low = Math.min(open, running)

    candles.push({
      x: new Date(year, month - 1, day).getTime(),
      y: [open, high, low, running]
    })
  }

  return candles
}

export const getPeriodTransactions = (
  transactions: NormalizedTransaction[],
  mode: 'annual' | 'monthly',
  year: number,
  month: number
): NormalizedTransaction[] => {
  if (mode === 'annual') {
    return transactions.filter((item) => item.year === year)
  }

  return transactions.filter((item) => item.year === year && item.month === month)
}

export const getPreviousPeriod = (
  mode: 'annual' | 'monthly',
  year: number,
  month: number
): { year: number; month: number } => {
  if (mode === 'annual') {
    return { year: year - 1, month: 12 }
  }

  if (month === 1) {
    return { year: year - 1, month: 12 }
  }

  return { year, month: month - 1 }
}

export const buildLast12MonthsSeries = (
  transactions: NormalizedTransaction[],
  endYear: number,
  endMonth: number
): TimePoint[] => {
  const result: TimePoint[] = []

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(endYear, endMonth - 1 - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const current = transactions.filter((item) => item.year === year && item.month === month)
    const totals = calculatePeriodTotals(current)

    result.push({
      label: `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`,
      revenue: totals.revenue,
      expense: totals.expense,
      profit: totals.profit,
      year,
      month
    })
  }

  return result
}

export const buildLastNPeriodProfits = (
  transactions: NormalizedTransaction[],
  mode: 'annual' | 'monthly',
  year: number,
  month: number,
  count: number
): number[] => {
  const values: number[] = []

  for (let i = count - 1; i >= 0; i -= 1) {
    if (mode === 'annual') {
      values.push(calculateAnnualProfit(transactions, year - i))
      continue
    }

    const date = new Date(year, month - 1 - i, 1)
    values.push(calculateMonthlyProfit(transactions, date.getFullYear(), date.getMonth() + 1))
  }

  return values
}
