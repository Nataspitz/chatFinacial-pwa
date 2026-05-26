import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { financeService } from '../../../services/finance.service'
import type { Transaction } from '../../../types/transaction.types'
import { shouldAffectFinancialReports } from '../../../utils/transaction-reports'
import type { CalendarCell, DayTotals, DayTransactions } from '../types'

const toDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeTransactionDate = (value: string): string | null => {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

const getAvailableYears = (transactions: Transaction[], currentYear: number): number[] => {
  const years = transactions
    .map((transaction) => normalizeTransactionDate(transaction.date))
    .filter((date): date is string => Boolean(date))
    .map((date) => Number(date.slice(0, 4)))
    .filter((year) => Number.isInteger(year))

  if (years.length === 0) {
    return [currentYear]
  }

  const minYear = Math.min(...years)
  const maxYear = Math.max(currentYear, ...years)
  const result: number[] = []

  for (let year = maxYear; year >= minYear; year -= 1) {
    result.push(year)
  }

  return result
}

interface DayData {
  totals: DayTotals
  transactions: DayTransactions
}

const ensureDayData = (map: Record<string, DayData>, key: string): DayData => {
  if (!map[key]) {
    map[key] = {
      totals: { entrada: 0, saida: 0 },
      transactions: { entrada: [], saida: [] }
    }
  }
  return map[key]
}

const buildDailyDataMap = (transactions: Transaction[], monthDate: Date): Record<string, DayData> => {
  const map: Record<string, DayData> = {}
  const targetYear = monthDate.getFullYear()
  const targetMonth = monthDate.getMonth() + 1
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()

  transactions.forEach((transaction) => {
    const normalizedDate = normalizeTransactionDate(transaction.date)
    if (!normalizedDate) {
      return
    }

    const [year, month, day] = normalizedDate.split('-').map(Number)

    if (transaction.type === 'saida' && transaction.isMonthlyCost) {
      const isAfterStartMonth = targetYear > year || (targetYear === year && targetMonth >= month)
      if (!isAfterStartMonth) {
        return
      }

      const adjustedDay = Math.min(day, daysInMonth)
      const recurringKey = toDateKey(new Date(targetYear, targetMonth - 1, adjustedDay))
      const dayData = ensureDayData(map, recurringKey)

      dayData.totals.saida += transaction.amount
      dayData.transactions.saida.push({
        ...transaction,
        date: recurringKey
      })
      return
    }

    const isSameMonth = year === targetYear && month === targetMonth
    if (!isSameMonth) {
      return
    }

    const dayData = ensureDayData(map, normalizedDate)

    if (transaction.type === 'entrada') {
      dayData.totals.entrada += transaction.amount
      dayData.transactions.entrada.push(transaction)
    } else {
      dayData.totals.saida += transaction.amount
      dayData.transactions.saida.push(transaction)
    }
  })

  Object.values(map).forEach((dayData) => {
    dayData.transactions.entrada.sort((a, b) => b.amount - a.amount)
    dayData.transactions.saida.sort((a, b) => b.amount - a.amount)
  })

  return map
}

const buildCalendarCells = (monthDate: Date, dailyDataMap: Record<string, DayData>): CalendarCell[] => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const startDate = new Date(year, month, 1 - startOffset)

  const cells: CalendarCell[] = []

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(startDate)
    cellDate.setDate(startDate.getDate() + i)

    const key = toDateKey(cellDate)
    const dayData = dailyDataMap[key]

    cells.push({
      key,
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
      totals: dayData?.totals ?? { entrada: 0, saida: 0 },
      transactions: dayData?.transactions ?? { entrada: [], saida: [] }
    })
  }

  return cells
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatMonthTitle = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long'
  }).format(date)
}

interface UseCalendarDataResult {
  availableYears: number[]
  cells: CalendarCell[]
  currentMonth: Date
  error: string
  formatCurrency: (value: number) => string
  formatMonthTitle: (date: Date) => string
  goToNextMonth: () => void
  goToPreviousMonth: () => void
  isLoading: boolean
  monthTotalEntrada: number
  monthTotalSaida: number
  onYearChange: (event: ChangeEvent<HTMLSelectElement>) => void
  todayKey: string
}

export const useCalendarData = (): UseCalendarDataResult => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const isRefreshingRef = useRef(false)
  const todayKey = toDateKey(new Date())

  const loadTransactions = async (silent = false): Promise<void> => {
    if (isRefreshingRef.current) {
      return
    }

    isRefreshingRef.current = true
    if (!silent) {
      setIsLoading(true)
      setError('')
    }

    try {
      const data = await financeService.getTransactions()
      setTransactions(data.filter(shouldAffectFinancialReports))
    } catch {
      if (!silent) {
        setError('Não foi possível carregar os dados do calendário.')
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
      isRefreshingRef.current = false
    }
  }

  useEffect(() => {
    void loadTransactions()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadTransactions(true)
    }, 30000)

    const handleFocusRefresh = (): void => {
      void loadTransactions(true)
    }

    window.addEventListener('focus', handleFocusRefresh)
    document.addEventListener('visibilitychange', handleFocusRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocusRefresh)
      document.removeEventListener('visibilitychange', handleFocusRefresh)
    }
  }, [])

  const dailyDataMap = useMemo(
    () => buildDailyDataMap(transactions, currentMonth),
    [transactions, currentMonth]
  )
  const cells = useMemo(() => buildCalendarCells(currentMonth, dailyDataMap), [currentMonth, dailyDataMap])
  const availableYears = useMemo(
    () => getAvailableYears(transactions, new Date().getFullYear()),
    [transactions]
  )

  const monthTotalEntrada = useMemo(() => {
    return cells
      .filter((cell) => cell.isCurrentMonth)
      .reduce((acc, cell) => acc + cell.totals.entrada, 0)
  }, [cells])

  const monthTotalSaida = useMemo(() => {
    return cells
      .filter((cell) => cell.isCurrentMonth)
      .reduce((acc, cell) => acc + cell.totals.saida, 0)
  }, [cells])

  const goToPreviousMonth = (): void => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = (): void => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const onYearChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const selectedYear = Number(event.target.value)
    if (Number.isNaN(selectedYear)) {
      return
    }
    setCurrentMonth((prev) => new Date(selectedYear, prev.getMonth(), 1))
  }

  return {
    availableYears,
    cells,
    currentMonth,
    error,
    formatCurrency,
    formatMonthTitle,
    goToNextMonth,
    goToPreviousMonth,
    isLoading,
    monthTotalEntrada,
    monthTotalSaida,
    onYearChange,
    todayKey
  }
}
