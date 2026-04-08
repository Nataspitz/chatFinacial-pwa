import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { financeService } from '../../../services/finance.service'
import type { Transaction } from '../../../types/transaction.types'
import type { CalendarCell, DayTotals } from '../types'

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

const buildDailyTotalsMap = (transactions: Transaction[], monthDate: Date): Record<string, DayTotals> => {
  const map: Record<string, DayTotals> = {}
  const monthYear = monthDate.getFullYear()
  const monthIndex = monthDate.getMonth()
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate()

  transactions.forEach((transaction) => {
    const normalizedDate = normalizeTransactionDate(transaction.date)
    if (!normalizedDate) {
      return
    }

    const [year, month, day] = normalizedDate.split('-').map(Number)
    const isMonthlyCost = transaction.type === 'saida' && transaction.isMonthlyCost

    if (isMonthlyCost) {
      if (day > daysInMonth) {
        return
      }

      const recurringKey = toDateKey(new Date(monthYear, monthIndex, day))
      if (!map[recurringKey]) {
        map[recurringKey] = { entrada: 0, saida: 0 }
      }
      map[recurringKey].saida += transaction.amount
      return
    }

    const isSameMonth = year === monthYear && month === monthIndex + 1
    if (!isSameMonth) {
      return
    }

    const key = normalizedDate
    if (!map[key]) {
      map[key] = { entrada: 0, saida: 0 }
    }

    if (transaction.type === 'entrada') {
      map[key].entrada += transaction.amount
    } else {
      map[key].saida += transaction.amount
    }
  })

  return map
}

const buildCalendarCells = (monthDate: Date, totalsMap: Record<string, DayTotals>): CalendarCell[] => {
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
    cells.push({
      key,
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === month,
      totals: totalsMap[key] ?? { entrada: 0, saida: 0 }
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
  const todayKey = toDateKey(new Date())

  useEffect(() => {
    void (async () => {
      try {
        const data = await financeService.getTransactions()
        setTransactions(data)
      } catch {
        setError('Nao foi possivel carregar os dados do calendario.')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const totalsMap = useMemo(
    () => buildDailyTotalsMap(transactions, currentMonth),
    [transactions, currentMonth]
  )
  const cells = useMemo(() => buildCalendarCells(currentMonth, totalsMap), [currentMonth, totalsMap])
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
