import { financeService } from './finance.service'
import type { CfoAlert, CfoCategoryTotal, CfoFinancialSnapshot, CfoForecast, CfoGrowth, CfoTotals } from '../types/cfo.types'
import type { Transaction } from '../types/transaction.types'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DEFAULT_FORECAST_DAYS = 30
const MAX_TOP_CATEGORIES = 5

interface Period {
  year: number
  month: number
}

interface SnapshotOptions {
  referenceDate?: Date
  forecastDays?: number
}

interface ForecastOperation {
  dateKey: string
  type: Transaction['type']
  amount: number
}

const parseDate = (value: string): Date | null => {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  }

  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
  }

  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

const toDateKey = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeTransactionDate = (value: string): string | null => {
  const parsed = parseDate(value)
  return parsed ? toDateKey(parsed) : null
}

const getPeriodFromDate = (value: Date): Period => ({
  year: value.getFullYear(),
  month: value.getMonth() + 1
})

const shiftPeriod = (period: Period, offset: number): Period => {
  const shifted = new Date(period.year, period.month - 1 + offset, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}

const isSamePeriod = (dateKey: string, period: Period): boolean =>
  dateKey.slice(0, 7) === `${period.year}-${String(period.month).padStart(2, '0')}`

const calculateGrowth = (current: number, previous: number): number | null => {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }

  return ((current - previous) / Math.abs(previous)) * 100
}

const calculateTotals = (items: Transaction[]): CfoTotals => {
  const revenue = items.filter((item) => item.type === 'entrada').reduce((acc, item) => acc + item.amount, 0)
  const expense = items.filter((item) => item.type === 'saida').reduce((acc, item) => acc + item.amount, 0)
  const profit = revenue - expense

  return {
    revenue,
    expense,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : null
  }
}

const buildTopCategories = (items: Transaction[], type: Transaction['type']): CfoCategoryTotal[] => {
  const grouped = new Map<string, number>()

  items
    .filter((item) => item.type === type)
    .forEach((item) => {
      grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amount)
    })

  return Array.from(grouped.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_TOP_CATEGORIES)
}

const calculatePeriodProfit = (transactionsByDate: Array<{ dateKey: string; transaction: Transaction }>, period: Period): number => {
  const periodItems = transactionsByDate
    .filter((item) => isSamePeriod(item.dateKey, period))
    .map((item) => item.transaction)

  return calculateTotals(periodItems).profit
}

const buildForecast = (
  transactionsByDate: Array<{ dateKey: string; transaction: Transaction }>,
  today: Date,
  forecastDays: number
): CfoForecast => {
  const todayKey = toDateKey(today)
  const horizonDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + forecastDays)
  const horizonKey = toDateKey(horizonDate)

  const existingIdentities = new Set(
    transactionsByDate.map(({ dateKey, transaction }) =>
      `${transaction.type}|${transaction.category}|${transaction.amount.toFixed(2)}|${transaction.description}|${dateKey}`
    )
  )

  const baseBalance = transactionsByDate
    .filter((item) => item.dateKey <= todayKey)
    .reduce((acc, item) => acc + (item.transaction.type === 'entrada' ? item.transaction.amount : -item.transaction.amount), 0)

  const scheduledFutureOps: ForecastOperation[] = transactionsByDate
    .filter((item) => item.dateKey > todayKey && item.dateKey <= horizonKey)
    .map((item) => ({
      dateKey: item.dateKey,
      type: item.transaction.type,
      amount: item.transaction.amount
    }))

  const recurringTemplates = transactionsByDate
    .map((item) => item.transaction)
    .filter((item) => item.type === 'saida' && item.isMonthlyCost)

  const recurringOps: ForecastOperation[] = []

  recurringTemplates.forEach((template) => {
    const templateStart = parseDate(template.date)
    if (!templateStart) return

    const firstForecastMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    for (let offset = 0; offset <= 12; offset += 1) {
      const monthDate = new Date(firstForecastMonth.getFullYear(), firstForecastMonth.getMonth() + offset, 1)
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
      const dueDay = Math.min(templateStart.getDate(), lastDay)
      const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), dueDay)
      const dueKey = toDateKey(dueDate)

      if (dueDate <= templateStart || dueKey <= todayKey) continue
      if (dueKey > horizonKey) break

      const recurringIdentity = `${template.type}|${template.category}|${template.amount.toFixed(2)}|${template.description}|${dueKey}`
      if (existingIdentities.has(recurringIdentity)) continue

      recurringOps.push({
        dateKey: dueKey,
        type: template.type,
        amount: template.amount
      })
    }
  })

  const allFutureOps = [...scheduledFutureOps, ...recurringOps]
  const estimatedRevenue = allFutureOps.filter((item) => item.type === 'entrada').reduce((acc, item) => acc + item.amount, 0)
  const estimatedExpense = allFutureOps.filter((item) => item.type === 'saida').reduce((acc, item) => acc + item.amount, 0)

  const netByDate = new Map<string, number>()
  allFutureOps.forEach((item) => {
    const netValue = item.type === 'entrada' ? item.amount : -item.amount
    netByDate.set(item.dateKey, (netByDate.get(item.dateKey) ?? 0) + netValue)
  })

  const points: CfoForecast['points'] = []
  let runningBalance = baseBalance

  for (let offset = 1; offset <= forecastDays; offset += 1) {
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    const key = toDateKey(current)
    runningBalance += netByDate.get(key) ?? 0
    points.push({ date: key, balance: runningBalance })
  }

  return {
    days: forecastDays,
    startingBalance: baseBalance,
    estimatedEndingBalance: runningBalance,
    estimatedRevenue,
    estimatedExpense,
    points
  }
}

const buildAlerts = (
  totals: CfoTotals,
  growth: CfoGrowth,
  monthProfits: [number, number, number],
  forecast: CfoForecast
): CfoAlert[] => {
  const alerts: CfoAlert[] = []

  if (totals.profit < 0) {
    alerts.push({
      code: 'negative_profit',
      title: 'Lucro negativo no período',
      description: 'As despesas do período superaram as receitas.',
      severity: 'critical'
    })
  }

  if (totals.expense > totals.revenue) {
    alerts.push({
      code: 'expense_over_revenue',
      title: 'Despesa acima da receita',
      description: 'A operação atual está consumindo mais caixa do que gera.',
      severity: 'critical'
    })
  }

  if (growth.expense !== null && growth.revenue !== null && growth.expense > growth.revenue) {
    alerts.push({
      code: 'expense_growth_over_revenue_growth',
      title: 'Despesa crescendo mais que receita',
      description: 'A velocidade de crescimento de custos está maior que a de faturamento.',
      severity: 'warning'
    })
  }

  const [currentProfit, previousProfit, olderProfit] = monthProfits
  if (currentProfit < previousProfit && previousProfit < olderProfit) {
    alerts.push({
      code: 'downward_profit_trend',
      title: 'Tendência de queda no lucro',
      description: 'Os últimos 3 períodos mostram deterioração sequencial do resultado.',
      severity: 'warning'
    })
  }

  if (forecast.estimatedEndingBalance < 0) {
    alerts.push({
      code: 'negative_forecast_balance',
      title: 'Saldo futuro estimado negativo',
      description: `Mantido o ritmo atual, o saldo projetado em ${forecast.days} dias fica abaixo de zero.`,
      severity: 'critical'
    })
  }

  if (forecast.estimatedExpense > totals.revenue && forecast.estimatedExpense > 0) {
    alerts.push({
      code: 'high_future_commitment',
      title: 'Comprometimento futuro elevado',
      description: 'As saídas previstas para o horizonte estão maiores que a receita atual do período.',
      severity: 'warning'
    })
  }

  return alerts
}

export const cfoContextService = {
  getFinancialSnapshot: async (options: SnapshotOptions = {}): Promise<CfoFinancialSnapshot> => {
    const now = options.referenceDate ?? new Date()
    const forecastDays = Math.max(7, Math.min(90, options.forecastDays ?? DEFAULT_FORECAST_DAYS))
    const currentPeriod = getPeriodFromDate(now)
    const previousPeriod = shiftPeriod(currentPeriod, -1)
    const olderPeriod = shiftPeriod(currentPeriod, -2)

    const transactions = await financeService.getTransactions()
    const transactionsByDate = transactions
      .map((transaction) => {
        const dateKey = normalizeTransactionDate(transaction.date)
        if (!dateKey) return null
        return { dateKey, transaction: { ...transaction, date: dateKey } }
      })
      .filter((item): item is { dateKey: string; transaction: Transaction } => item !== null)

    const currentTransactions = transactionsByDate
      .filter((item) => isSamePeriod(item.dateKey, currentPeriod))
      .map((item) => item.transaction)

    const previousTransactions = transactionsByDate
      .filter((item) => isSamePeriod(item.dateKey, previousPeriod))
      .map((item) => item.transaction)

    const totals = calculateTotals(currentTransactions)
    const previousTotals = calculateTotals(previousTransactions)

    const growth: CfoGrowth = {
      revenue: calculateGrowth(totals.revenue, previousTotals.revenue),
      expense: calculateGrowth(totals.expense, previousTotals.expense),
      profit: calculateGrowth(totals.profit, previousTotals.profit)
    }

    const forecast = buildForecast(transactionsByDate, now, forecastDays)
    const currentProfit = calculatePeriodProfit(transactionsByDate, currentPeriod)
    const previousProfit = calculatePeriodProfit(transactionsByDate, previousPeriod)
    const olderProfit = calculatePeriodProfit(transactionsByDate, olderPeriod)
    const alerts = buildAlerts(totals, growth, [currentProfit, previousProfit, olderProfit], forecast)

    return {
      generatedAt: new Date().toISOString(),
      period: {
        year: currentPeriod.year,
        month: currentPeriod.month,
        label: `${MONTH_LABELS[currentPeriod.month - 1]}/${currentPeriod.year}`
      },
      totals,
      growth,
      alerts,
      topExpenseCategories: buildTopCategories(currentTransactions, 'saida'),
      topRevenueCategories: buildTopCategories(currentTransactions, 'entrada'),
      forecast,
      metadata: {
        transactionCount: transactionsByDate.length,
        futureTransactionCount: transactionsByDate.filter((item) => item.dateKey > toDateKey(now)).length
      }
    }
  }
}
