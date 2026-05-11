import { useEffect, useMemo, useState } from 'react'
import { businessService } from '../../../services/business.service'
import { financeService } from '../../../services/finance.service'
import type { ExportReportPdfPayload } from '../../../types/report-export.types'
import type { Transaction } from '../../../types/transaction.types'
import {
  getPreviousDate,
  getLastDayOfMonth,
  getTodayDate,
  normalizeTransactionDate
} from '../components/report-page.date-utils'
import { initialExportFormState } from '../components/report-page.forms'
import {
  calculateAccountBalanceAt,
  formatCurrency,
  getExportDateRange,
  normalizeCategoryValue,
  resolveAccountBalanceBase,
  sortTransactionsByDateAsc,
  toExportReportPdfTransaction
} from '../components/report-page.utils'
import { buildMonthlyCostForPeriod } from '../components/report-page.monthly-cost'
import { MONTH_LABELS, type ExportFormState } from '../components/report-page.types'

export const useReportExport = (transactions: Transaction[], userMetadata: Record<string, unknown>) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFeedback, setExportFeedback] = useState('')
  const [exportForm, setExportForm] = useState<ExportFormState>(initialExportFormState)

  const exportYearOptions = useMemo(() => {
    const years = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.slice(0, 4))
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a))
    return uniqueYears.length > 0 ? uniqueYears : [String(new Date().getFullYear())]
  }, [transactions])

  const exportDayOptions = useMemo(() => {
    const lastDay = Number(getLastDayOfMonth(exportForm.year, exportForm.month).slice(8, 10))
    return Array.from({ length: lastDay }, (_, index) => String(index + 1).padStart(2, '0'))
  }, [exportForm.month, exportForm.year])

  useEffect(() => {
    if (!exportYearOptions.includes(exportForm.year)) {
      setExportForm((prev) => ({ ...prev, year: exportYearOptions[0] }))
    }
  }, [exportForm.year, exportYearOptions])

  useEffect(() => {
    if (!exportDayOptions.includes(exportForm.day)) {
      setExportForm((prev) => ({ ...prev, day: exportDayOptions[0] }))
    }
    if (!exportDayOptions.includes(exportForm.startDay)) {
      setExportForm((prev) => ({ ...prev, startDay: exportDayOptions[0] }))
    }
    if (!exportDayOptions.includes(exportForm.endDay)) {
      setExportForm((prev) => ({ ...prev, endDay: exportDayOptions[exportDayOptions.length - 1] ?? exportDayOptions[0] }))
    }
  }, [exportDayOptions, exportForm.day, exportForm.endDay, exportForm.startDay])

  const exportTransactions = useMemo(
    () => {
      const exportRange = getExportDateRange(exportForm)

      return transactions.flatMap((item) => {
        const normalizedDate = normalizeTransactionDate(item.date)
        if (!normalizedDate) return []

        const [year, month, day] = normalizedDate.split('-')
        if (exportForm.periodType === 'year') return year === exportForm.year ? [item] : []
        if (exportForm.periodType === 'month') {
          if (year === exportForm.year && month === exportForm.month) return [item]
          const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, exportForm.year, exportForm.month, 'all')
          return monthlyCostInPeriod ? [monthlyCostInPeriod] : []
        }

        if (exportForm.periodType === 'monthRange') {
          if (year === exportForm.year && month === exportForm.month && normalizedDate >= exportRange.startDate && normalizedDate <= exportRange.endDate) {
            return [item]
          }

          const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, exportForm.year, exportForm.month, 'all')
          if (!monthlyCostInPeriod) return []

          const monthlyCostDate = normalizeTransactionDate(monthlyCostInPeriod.date)
          return monthlyCostDate && monthlyCostDate >= exportRange.startDate && monthlyCostDate <= exportRange.endDate
            ? [monthlyCostInPeriod]
            : []
        }

        if (year === exportForm.year && month === exportForm.month && day === exportForm.day) return [item]
        const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, exportForm.year, exportForm.month, exportForm.day)
        return monthlyCostInPeriod ? [monthlyCostInPeriod] : []
      })
    },
    [exportForm, transactions]
  )

  const exportEntries = useMemo(
    () => sortTransactionsByDateAsc(exportTransactions.filter((item) => item.type === 'entrada')).map(toExportReportPdfTransaction),
    [exportTransactions]
  )
  const exportOutcomes = useMemo(
    () => sortTransactionsByDateAsc(exportTransactions.filter((item) => item.type === 'saida')).map(toExportReportPdfTransaction),
    [exportTransactions]
  )
  const exportTotalEntries = useMemo(() => exportEntries.reduce((acc, item) => acc + item.amount, 0), [exportEntries])
  const exportTotalOutcomes = useMemo(() => exportOutcomes.reduce((acc, item) => acc + item.amount, 0), [exportOutcomes])
  const exportResultBalance = useMemo(() => exportTotalEntries - exportTotalOutcomes, [exportTotalEntries, exportTotalOutcomes])

  const getExportPeriodLabel = (): string => {
    if (exportForm.periodType === 'year') return `Ano: ${exportForm.year}`
    const monthLabel = MONTH_LABELS[exportForm.month] ?? exportForm.month
    if (exportForm.periodType === 'month') return `Mês: ${monthLabel}/${exportForm.year}`
    if (exportForm.periodType === 'monthRange') {
      return `Período: ${exportForm.startDay}/${exportForm.month}/${exportForm.year} a ${exportForm.endDay}/${exportForm.month}/${exportForm.year} (${monthLabel})`
    }
    return `Dia: ${exportForm.day}/${exportForm.month}/${exportForm.year} (${monthLabel})`
  }

  const handleExportReport = async (): Promise<void> => {
    const fileName = normalizeCategoryValue(exportForm.fileName)
    if (!fileName) {
      setExportFeedback('Informe o nome do arquivo.')
      return
    }
    if (exportForm.periodType === 'day' && !exportForm.day) {
      setExportFeedback('Selecione o dia para exportar.')
      return
    }
    if (exportForm.periodType === 'monthRange' && exportForm.startDay > exportForm.endDay) {
      setExportFeedback('Selecione um período com dia inicial menor ou igual ao dia final.')
      return
    }

    const companyName =
      typeof userMetadata.company_name === 'string' && userMetadata.company_name.trim()
        ? userMetadata.company_name.trim()
        : 'Empresa não informada'
    const exportRange = getExportDateRange(exportForm)
    const previousBalanceDate = getPreviousDate(exportRange.startDate)

    setIsExporting(true)
    setExportFeedback('')

    let accountBalanceBase = resolveAccountBalanceBase(transactions, 0, getTodayDate())
    try {
      const businessSettings = await businessService.getBusinessSettings()
      accountBalanceBase = resolveAccountBalanceBase(
        transactions,
        businessSettings.account_balance_base_amount,
        businessSettings.account_balance_base_date
      )
    } catch (balanceError) {
      console.warn('Não foi possível carregar o saldo de conta para o PDF.', balanceError)
    }

    const previousAccountBalance = calculateAccountBalanceAt(
      transactions,
      accountBalanceBase.baseAmount,
      accountBalanceBase.baseDate,
      previousBalanceDate
    )
    const currentAccountBalance = calculateAccountBalanceAt(
      transactions,
      accountBalanceBase.baseAmount,
      accountBalanceBase.baseDate,
      exportRange.endDate
    )

    const payload: ExportReportPdfPayload = {
      fileName,
      companyName,
      createdAt: new Date().toISOString(),
      periodLabel: getExportPeriodLabel(),
      entries: exportEntries,
      outcomes: exportOutcomes,
      totalEntries: exportTotalEntries,
      totalOutcomes: exportTotalOutcomes,
      resultBalance: exportResultBalance,
      previousAccountBalance,
      currentAccountBalance,
      dashboardMetrics: [
        { label: 'Receita do período', value: formatCurrency(exportTotalEntries) },
        { label: 'Despesa do período', value: formatCurrency(exportTotalOutcomes) },
        { label: 'Lucro líquido', value: formatCurrency(exportResultBalance) },
        { label: 'Saldo anterior', value: formatCurrency(previousAccountBalance) },
        { label: 'Saldo atual', value: formatCurrency(currentAccountBalance) },
        { label: 'Margem', value: exportTotalEntries > 0 ? `${((exportResultBalance / exportTotalEntries) * 100).toFixed(2)}%` : 'N/D' }
      ]
    }

    try {
      await financeService.exportReportPdf(payload)
      setIsExportModalOpen(false)
    } catch {
      setExportFeedback('Não foi possível exportar o relatório em PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  return {
    isExporting,
    isExportModalOpen,
    setIsExportModalOpen,
    exportFeedback,
    setExportFeedback,
    exportForm,
    setExportForm,
    exportYearOptions,
    exportDayOptions,
    exportTotalEntries,
    exportTotalOutcomes,
    exportResultBalance,
    handleExportReport
  }
}
