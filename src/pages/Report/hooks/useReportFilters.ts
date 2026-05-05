import { useMemo, useState } from 'react'
import type { Transaction } from '../../../types/transaction.types'
import { buildMonthlyCostForPeriod } from '../components/report-page.monthly-cost'
import { getCurrentMonth, getCurrentYear, getTodayDate, normalizeTransactionDate } from '../components/report-page.date-utils'
import { formatCurrency, isTransactionInFuture, sortTransactionsByDateAsc } from '../components/report-page.utils'
import {
  initialCombinedFilterDraftState,
  initialListFilterState
} from '../components/report-page.forms'
import type { CombinedFilterDraftState, ListFilterState } from '../components/report-page.types'

export const useReportFilters = (transactions: Transaction[]) => {
  const [selectedYear, setSelectedYear] = useState(getCurrentYear)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [selectedDay, setSelectedDay] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isListFilterModalOpen, setIsListFilterModalOpen] = useState(false)
  const [appliedListFilter, setAppliedListFilter] = useState<ListFilterState>(initialListFilterState)
  const [draftCombinedFilter, setDraftCombinedFilter] = useState<CombinedFilterDraftState>(initialCombinedFilterDraftState)

  const yearOptions = useMemo(() => {
    const years = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.slice(0, 4))
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a))
    const currentYear = getCurrentYear()
    return ['all', ...Array.from(new Set([currentYear, ...uniqueYears])).sort((a, b) => Number(b) - Number(a))]
  }, [transactions])

  const filteredTransactions = useMemo(
    () =>
      transactions.flatMap((item) => {
        const normalizedDate = normalizeTransactionDate(item.date)
        if (!normalizedDate) return []

        const [year, month, day] = normalizedDate.split('-')
        const matchesDate =
          (selectedYear === 'all' || year === selectedYear)
          && (selectedMonth === 'all' || month === selectedMonth)
          && (selectedDay === 'all' || day === selectedDay)

        if (matchesDate) return [item]
        const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, selectedYear, selectedMonth, selectedDay)
        return monthlyCostInPeriod ? [monthlyCostInPeriod] : []
      }),
    [selectedDay, selectedMonth, selectedYear, transactions]
  )

  const combinedFilterDayOptions = useMemo(() => {
    const days = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const year = value.slice(0, 4)
        const month = value.slice(5, 7)
        return (
          (draftCombinedFilter.selectedYear === 'all' || year === draftCombinedFilter.selectedYear)
          && (draftCombinedFilter.selectedMonth === 'all' || month === draftCombinedFilter.selectedMonth)
        )
      })
      .map((value) => value.slice(8, 10))

    return ['all', ...Array.from(new Set(days)).sort((a, b) => Number(a) - Number(b))]
  }, [draftCombinedFilter.selectedMonth, draftCombinedFilter.selectedYear, transactions])

  const displayedTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const maxAmountLimit = Number(appliedListFilter.maxAmountLimit)
    const hasMaxAmountLimit = appliedListFilter.maxAmountLimit.trim() !== '' && Number.isFinite(maxAmountLimit)

    const filtered = filteredTransactions.filter((item) => {
      if (appliedListFilter.operationType !== 'all' && item.type !== appliedListFilter.operationType) return false
      if (hasMaxAmountLimit && item.amount > maxAmountLimit) return false
      if (!normalizedSearch) return true

      const searchableAmount = `${item.amount}`.replace('.', ',')
      const searchableText =
        `${item.category} ${item.description} ${item.amount} ${searchableAmount} ${formatCurrency(item.amount)}`.toLowerCase()
      return searchableText.includes(normalizedSearch)
    })

    return sortTransactionsByDateAsc(filtered)
  }, [appliedListFilter, filteredTransactions, searchTerm])

  const amountRangeMax = useMemo(() => {
    const maxAmount = transactions.reduce((highest, item) => Math.max(highest, item.amount), 0)
    return Math.max(100, Math.ceil(maxAmount / 100) * 100)
  }, [transactions])

  const todayDate = getTodayDate()
  const mainTransactions = useMemo(
    () => displayedTransactions.filter((item) => !isTransactionInFuture(item, todayDate)),
    [displayedTransactions, todayDate]
  )
  const futureTransactions = useMemo(
    () => displayedTransactions.filter((item) => isTransactionInFuture(item, todayDate)),
    [displayedTransactions, todayDate]
  )

  const handleApplyListFilter = (): void => {
    setSelectedYear(draftCombinedFilter.selectedYear)
    setSelectedMonth(draftCombinedFilter.selectedMonth)
    setSelectedDay(draftCombinedFilter.selectedDay)
    setAppliedListFilter({
      operationType: draftCombinedFilter.operationType,
      maxAmountLimit: draftCombinedFilter.maxAmountLimit.trim()
    })
    setIsListFilterModalOpen(false)
  }

  const handleClearListFilter = (): void => {
    setSelectedYear(getCurrentYear())
    setSelectedMonth(getCurrentMonth())
    setSelectedDay('all')
    setAppliedListFilter(initialListFilterState)
    setDraftCombinedFilter(initialCombinedFilterDraftState())
  }

  const hasActiveCombinedFilter =
    selectedYear !== getCurrentYear()
    || selectedMonth !== getCurrentMonth()
    || selectedDay !== 'all'
    || appliedListFilter.operationType !== 'all'
    || appliedListFilter.maxAmountLimit.trim() !== ''

  return {
    searchTerm,
    setSearchTerm,
    isListFilterModalOpen,
    setIsListFilterModalOpen,
    appliedListFilter,
    draftCombinedFilter,
    setDraftCombinedFilter,
    yearOptions,
    combinedFilterDayOptions,
    mainTransactions,
    futureTransactions,
    amountRangeMax,
    hasActiveCombinedFilter,
    handleApplyListFilter,
    handleClearListFilter,
    selectedYear,
    selectedMonth,
    selectedDay
  }
}
