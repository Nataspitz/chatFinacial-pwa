import { useEffect, useMemo, useState } from 'react'
import { FiFilter, FiSearch, FiX } from 'react-icons/fi'
import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import { LoadingState } from '../../../components/organisms/LoadingState/LoadingState'
import { PageTemplate } from '../../../components/templates/PageTemplate/PageTemplate'
import { useAuth } from '../../../contexts/AuthContext'
import { financeService, type CategoryItem } from '../../../services/finance.service'
import type { ExportReportPdfPayload } from '../../../types/report-export.types'
import type { PaymentMethod, Transaction, TransactionType } from '../../../types/transaction.types'
import { PageHeader } from './PageHeader'
import { TransactionsTable } from './TransactionsTable'
import styles from '../Report.module.css'

interface CreateFormState {
  type: Transaction['type']
  amount: string
  date: string
  category: string
  description: string
  isMonthlyCost: boolean
  paymentMethod: PaymentMethod
  installmentCount: number
}

interface ExportFormState {
  fileName: string
  periodType: 'year' | 'month' | 'day'
  year: string
  month: string
  day: string
}

interface ListFilterState {
  operationType: 'all' | TransactionType
  maxAmountLimit: string
}

interface CombinedFilterDraftState extends ListFilterState {
  selectedYear: string
  selectedMonth: string
  selectedDay: string
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (value: string): string => {
  const normalized = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!normalized) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
  }

  const [year, month, day] = normalized.split('-').map(Number)
  const localDate = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('pt-BR').format(localDate)
}

const normalizeTransactionDate = (value: string): string | null => {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

const getTodayDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getCurrentYear = (): string => String(new Date().getFullYear())

const getCurrentMonth = (): string => String(new Date().getMonth() + 1).padStart(2, '0')

const isTransactionInFuture = (transaction: Transaction, todayDate: string): boolean => {
  const normalizedDate = normalizeTransactionDate(transaction.date)
  return Boolean(normalizedDate && normalizedDate > todayDate)
}

const getDefaultConfirmedByDate = (dateValue: string): boolean => {
  const normalizedDate = normalizeTransactionDate(dateValue)
  if (!normalizedDate) {
    return true
  }

  return normalizedDate <= getTodayDate()
}

const initialCreateFormState: CreateFormState = {
  type: 'saida',
  amount: '',
  date: getTodayDate(),
  category: '',
  description: '',
  isMonthlyCost: false,
  paymentMethod: 'pix',
  installmentCount: 1
}

const initialExportFormState: ExportFormState = {
  fileName: 'relatorio-financeiro',
  periodType: 'month',
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1).padStart(2, '0'),
  day: String(new Date().getDate()).padStart(2, '0')
}

const initialListFilterState: ListFilterState = {
  operationType: 'all',
  maxAmountLimit: ''
}

const initialCombinedFilterDraftState = (): CombinedFilterDraftState => ({
  selectedYear: getCurrentYear(),
  selectedMonth: getCurrentMonth(),
  selectedDay: 'all',
  operationType: 'all',
  maxAmountLimit: ''
})

const normalizeCategoryValue = (value: string): string => value.trim().replace(/\s+/g, ' ')

const addMonthsKeepingDay = (baseDate: Date, monthOffset: number): Date => {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = baseDate.getDate()
  const targetFirstDay = new Date(year, month + monthOffset, 1)
  const lastDay = new Date(targetFirstDay.getFullYear(), targetFirstDay.getMonth() + 1, 0).getDate()
  return new Date(targetFirstDay.getFullYear(), targetFirstDay.getMonth(), Math.min(day, lastDay))
}

const splitAmountIntoInstallments = (totalAmount: number, count: number): number[] => {
  const totalInCents = Math.round(totalAmount * 100)
  const base = Math.floor(totalInCents / count)
  const remainder = totalInCents - base * count
  const result = Array.from({ length: count }, () => base)

  for (let i = 0; i < remainder; i += 1) {
    result[i] += 1
  }

  return result.map((item) => item / 100)
}

const getSortableDateValue = (value: string): number => {
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

const sortTransactionsByDateAsc = (items: Transaction[]): Transaction[] => {
  return [...items].sort((a, b) => getSortableDateValue(a.date) - getSortableDateValue(b.date))
}

const buildMonthlyCostForPeriod = (
  transaction: Transaction,
  selectedYear: string,
  selectedMonth: string,
  selectedDay: string
): Transaction | null => {
  if (transaction.type !== 'saida' || !transaction.isMonthlyCost) {
    return null
  }

  if (selectedYear === 'all' || selectedMonth === 'all') {
    return null
  }

  const normalizedDate = normalizeTransactionDate(transaction.date)
  if (!normalizedDate) {
    return null
  }

  const [year, month, originalDay] = normalizedDate.split('-').map(Number)
  const targetYear = Number(selectedYear)
  const targetMonth = Number(selectedMonth)

  if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonth)) {
    return null
  }

  const isAfterStartMonth = targetYear > year || (targetYear === year && targetMonth >= month)
  if (!isAfterStartMonth) {
    return null
  }

  const lastDayInTargetMonth = new Date(targetYear, targetMonth, 0).getDate()
  const adjustedDay = Math.min(originalDay, lastDayInTargetMonth)
  const adjustedDayLabel = String(adjustedDay).padStart(2, '0')
  const targetMonthLabel = String(targetMonth).padStart(2, '0')
  const targetDate = `${selectedYear}-${targetMonthLabel}-${adjustedDayLabel}`
  const matchDay = selectedDay === 'all' || adjustedDay === Number(selectedDay)

  if (!matchDay) {
    return null
  }

  const isGeneratedOccurrence = targetDate !== normalizedDate
  const isConfirmed = isGeneratedOccurrence ? Boolean(transaction.isConfirmed) && getDefaultConfirmedByDate(targetDate) : transaction.isConfirmed

  return {
    ...transaction,
    date: targetDate,
    isConfirmed
  }
}

const MONTH_LABELS: Record<string, string> = {
  all: 'Todos os meses',
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Marco',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
}

export const ReportPage = (): JSX.Element => {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>(getCurrentYear)
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth)
  const [selectedDay, setSelectedDay] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Transaction | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFeedback, setExportFeedback] = useState('')
  const [exportForm, setExportForm] = useState<ExportFormState>(initialExportFormState)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateFormState)
  const [isCreating, setIsCreating] = useState(false)
  const [createFeedback, setCreateFeedback] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<Record<TransactionType, CategoryItem[]>>({
    entrada: [],
    saida: []
  })
  const [categoryType, setCategoryType] = useState<TransactionType>('saida')
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryFeedback, setCategoryFeedback] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null)
  const [categoryDeletingId, setCategoryDeletingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isListFilterModalOpen, setIsListFilterModalOpen] = useState(false)
  const [isMobileActionsDrawerOpen, setIsMobileActionsDrawerOpen] = useState(false)
  const [appliedListFilter, setAppliedListFilter] = useState<ListFilterState>(initialListFilterState)
  const [draftCombinedFilter, setDraftCombinedFilter] = useState<CombinedFilterDraftState>(initialCombinedFilterDraftState)

  const loadTransactions = async (): Promise<void> => {
    try {
      const data = await financeService.getTransactions()
      setTransactions(data)
      setError('')
    } catch {
      setError('Nao foi possivel carregar as transacoes.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async (): Promise<void> => {
    try {
      const [entradaCategories, saidaCategories] = await Promise.all([
        financeService.getCategoryItems('entrada'),
        financeService.getCategoryItems('saida')
      ])

      setCategoryOptions({
        entrada: entradaCategories,
        saida: saidaCategories
      })
    } catch {
      setError('Nao foi possivel carregar as categorias.')
    }
  }

  useEffect(() => {
    void (async () => {
      await Promise.allSettled([loadTransactions(), loadCategories()])
      setIsLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const options = categoryOptions[createForm.type]
    if (options.length === 0) {
      return
    }

    if (!createForm.category || !options.some((option) => option.name === createForm.category)) {
      setCreateForm((prev) => ({ ...prev, category: options[0].name }))
    }
  }, [categoryOptions, createForm.category, createForm.type, isCreateModalOpen])

  const yearOptions = useMemo(() => {
    const years = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.slice(0, 4))

    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a))
    const currentYear = getCurrentYear()

    return ['all', ...Array.from(new Set([currentYear, ...uniqueYears])).sort((a, b) => Number(b) - Number(a))]
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    return transactions.flatMap((item) => {
      const normalizedDate = normalizeTransactionDate(item.date)
      if (!normalizedDate) {
        return []
      }

      const [year, month, day] = normalizedDate.split('-')
      const matchYear = selectedYear === 'all' || year === selectedYear
      const matchMonth = selectedMonth === 'all' || month === selectedMonth
      const matchDay = selectedDay === 'all' || day === selectedDay

      if (matchYear && matchMonth && matchDay) {
        return [item]
      }

      const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, selectedYear, selectedMonth, selectedDay)
      return monthlyCostInPeriod ? [monthlyCostInPeriod] : []
    })
  }, [selectedDay, selectedMonth, selectedYear, transactions])

  const combinedFilterDayOptions = useMemo(() => {
    const days = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .filter((value) => {
        const year = value.slice(0, 4)
        const month = value.slice(5, 7)
        const matchYear = draftCombinedFilter.selectedYear === 'all' || year === draftCombinedFilter.selectedYear
        const matchMonth = draftCombinedFilter.selectedMonth === 'all' || month === draftCombinedFilter.selectedMonth
        return matchYear && matchMonth
      })
      .map((value) => value.slice(8, 10))

    return ['all', ...Array.from(new Set(days)).sort((a, b) => Number(a) - Number(b))]
  }, [draftCombinedFilter.selectedMonth, draftCombinedFilter.selectedYear, transactions])

  const displayedTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const hasSearch = normalizedSearch.length > 0
    const maxAmountLimit = Number(appliedListFilter.maxAmountLimit)
    const hasMaxAmountLimit = appliedListFilter.maxAmountLimit.trim() !== '' && Number.isFinite(maxAmountLimit)

    return filteredTransactions.filter((item) => {
      if (appliedListFilter.operationType !== 'all' && item.type !== appliedListFilter.operationType) {
        return false
      }

      if (hasMaxAmountLimit && item.amount > maxAmountLimit) {
        return false
      }

      if (!hasSearch) {
        return true
      }

      const searchableAmount = `${item.amount}`.replace('.', ',')
      const searchableText = `${item.category} ${item.description} ${item.amount} ${searchableAmount} ${formatCurrency(item.amount)}`.toLowerCase()
      return searchableText.includes(normalizedSearch)
    })
  }, [appliedListFilter, filteredTransactions, searchTerm])

  const amountRangeMax = useMemo(() => {
    const maxAmount = transactions.reduce((highest, item) => Math.max(highest, item.amount), 0)
    const rounded = Math.ceil(maxAmount / 100) * 100
    return Math.max(100, rounded)
  }, [transactions])

  const exportYearOptions = useMemo(() => {
    const years = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.slice(0, 4))

    const uniqueYears = Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a))
    return uniqueYears.length > 0 ? uniqueYears : [String(new Date().getFullYear())]
  }, [transactions])

  const exportDayOptions = useMemo(() => {
    const days = transactions
      .map((item) => normalizeTransactionDate(item.date))
      .filter((value): value is string => Boolean(value))
      .filter((value) => value.slice(0, 4) === exportForm.year && value.slice(5, 7) === exportForm.month)
      .map((value) => value.slice(8, 10))

    const uniqueDays = Array.from(new Set(days)).sort((a, b) => Number(a) - Number(b))
    return uniqueDays.length > 0 ? uniqueDays : ['01']
  }, [exportForm.month, exportForm.year, transactions])

  useEffect(() => {
    if (!exportYearOptions.includes(exportForm.year)) {
      setExportForm((prev) => ({ ...prev, year: exportYearOptions[0] }))
    }
  }, [exportForm.year, exportYearOptions])

  useEffect(() => {
    if (!exportDayOptions.includes(exportForm.day)) {
      setExportForm((prev) => ({ ...prev, day: exportDayOptions[0] }))
    }
  }, [exportDayOptions, exportForm.day])

  const exportTransactions = useMemo(() => {
    return transactions.flatMap((item) => {
      const normalizedDate = normalizeTransactionDate(item.date)
      if (!normalizedDate) {
        return []
      }

      const [year, month, day] = normalizedDate.split('-')

      if (exportForm.periodType === 'year') {
        return year === exportForm.year ? [item] : []
      }

      if (exportForm.periodType === 'month') {
        if (year === exportForm.year && month === exportForm.month) {
          return [item]
        }

        const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, exportForm.year, exportForm.month, 'all')
        return monthlyCostInPeriod ? [monthlyCostInPeriod] : []
      }

      if (year === exportForm.year && month === exportForm.month && day === exportForm.day) {
        return [item]
      }

      const monthlyCostInPeriod = buildMonthlyCostForPeriod(item, exportForm.year, exportForm.month, exportForm.day)
      return monthlyCostInPeriod ? [monthlyCostInPeriod] : []
    })
  }, [exportForm.day, exportForm.month, exportForm.periodType, exportForm.year, transactions])

  const todayDate = getTodayDate()

  const mainTransactions = useMemo(
    () => displayedTransactions.filter((item) => item.isConfirmed || !isTransactionInFuture(item, todayDate)),
    [displayedTransactions, todayDate]
  )
  const futureTransactions = useMemo(
    () => displayedTransactions.filter((item) => !item.isConfirmed && isTransactionInFuture(item, todayDate)),
    [displayedTransactions, todayDate]
  )

  const exportEntries = useMemo(
    () => sortTransactionsByDateAsc(exportTransactions.filter((item) => item.type === 'entrada')),
    [exportTransactions]
  )
  const exportOutcomes = useMemo(
    () => sortTransactionsByDateAsc(exportTransactions.filter((item) => item.type === 'saida')),
    [exportTransactions]
  )
  const exportTotalEntries = useMemo(
    () => exportEntries.reduce((acc, item) => acc + item.amount, 0),
    [exportEntries]
  )
  const exportTotalOutcomes = useMemo(
    () => exportOutcomes.reduce((acc, item) => acc + item.amount, 0),
    [exportOutcomes]
  )
  const exportResultBalance = useMemo(
    () => exportTotalEntries - exportTotalOutcomes,
    [exportTotalEntries, exportTotalOutcomes]
  )

  const entries = useMemo(() => mainTransactions.filter((item) => item.type === 'entrada'), [mainTransactions])
  const outcomes = useMemo(() => mainTransactions.filter((item) => item.type === 'saida'), [mainTransactions])
  const futureEntries = useMemo(() => futureTransactions.filter((item) => item.type === 'entrada'), [futureTransactions])
  const futureOutcomes = useMemo(() => futureTransactions.filter((item) => item.type === 'saida'), [futureTransactions])
  const totalEntries = useMemo(() => entries.reduce((acc, item) => acc + item.amount, 0), [entries])
  const totalOutcomes = useMemo(() => outcomes.reduce((acc, item) => acc + item.amount, 0), [outcomes])
  const totalFutureEntries = useMemo(() => futureEntries.reduce((acc, item) => acc + item.amount, 0), [futureEntries])
  const totalFutureOutcomes = useMemo(() => futureOutcomes.reduce((acc, item) => acc + item.amount, 0), [futureOutcomes])
  const resultBalance = useMemo(() => totalEntries - totalOutcomes, [totalEntries, totalOutcomes])
  const hasActiveCombinedFilter = useMemo(
    () =>
      selectedYear !== getCurrentYear()
      || selectedMonth !== getCurrentMonth()
      || selectedDay !== 'all'
      || appliedListFilter.operationType !== 'all'
      || appliedListFilter.maxAmountLimit.trim() !== '',
    [appliedListFilter, selectedDay, selectedMonth, selectedYear]
  )

  const handleDelete = async (id: string): Promise<void> => {
    const transaction = transactions.find((item) => item.id === id) ?? null
    setDeleteCandidate(transaction)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteCandidate) return
    const id = deleteCandidate.id
    setDeletingId(id)

    try {
      await financeService.deleteTransaction(id)
      await loadTransactions()
      if (editingId === id) {
        setEditingId(null)
        setEditingDraft(null)
      }
      setDeleteCandidate(null)
      setError('')
    } catch {
      setError('Nao foi possivel apagar a transacao.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditStart = (transaction: Transaction): void => {
    setEditingId(transaction.id)
    setEditingDraft({
      ...transaction,
      isConfirmed: Boolean(transaction.isConfirmed),
      isMonthlyCost: transaction.type === 'saida' ? Boolean(transaction.isMonthlyCost) : false
    })
    setError('')
  }

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

  const handleEditCancel = (): void => {
    setEditingId(null)
    setEditingDraft(null)
  }

  const handleEditChange = (
    field: 'date' | 'category' | 'description' | 'amount' | 'isConfirmed' | 'isMonthlyCost' | 'paymentMethod',
    value: string | boolean
  ): void => {
    if (!editingDraft) return

    if (field === 'amount') {
      const nextAmount = Number(value as string)
      setEditingDraft({ ...editingDraft, amount: Number.isFinite(nextAmount) ? nextAmount : 0 })
      return
    }

    if (field === 'isMonthlyCost') {
      setEditingDraft({
        ...editingDraft,
        isMonthlyCost: editingDraft.type === 'saida' ? Boolean(value) : false
      })
      return
    }

    if (field === 'isConfirmed') {
      setEditingDraft({
        ...editingDraft,
        isConfirmed: Boolean(value)
      })
      return
    }

    if (field === 'paymentMethod') {
      const paymentMethod = value as PaymentMethod
      setEditingDraft({
        ...editingDraft,
        paymentMethod,
        installmentCount: paymentMethod === 'credito' ? editingDraft.installmentCount : 1,
        installmentNumber: paymentMethod === 'credito' ? editingDraft.installmentNumber : 1,
        installmentGroupId: paymentMethod === 'credito' && editingDraft.installmentCount > 1 ? editingDraft.installmentGroupId : null,
        isInstallment: paymentMethod === 'credito' && editingDraft.installmentCount > 1
      })
      return
    }

    setEditingDraft({ ...editingDraft, [field]: value as string })
  }

  const handleEditSave = async (): Promise<void> => {
    if (!editingDraft || !editingId) return

    if (!editingDraft.category.trim() || !editingDraft.description.trim() || editingDraft.amount <= 0 || !editingDraft.date) {
      setError('Preencha os campos da edicao com valores validos.')
      return
    }

    setIsSavingEdit(true)

    try {
      const category = normalizeCategoryValue(editingDraft.category)
      const safeDraft: Transaction = {
        ...editingDraft,
        category,
        description: editingDraft.description.trim(),
        isConfirmed: Boolean(editingDraft.isConfirmed),
        isMonthlyCost: editingDraft.type === 'saida' ? editingDraft.isMonthlyCost : false,
        paymentMethod: editingDraft.paymentMethod,
        installmentCount: editingDraft.paymentMethod === 'credito' ? editingDraft.installmentCount : 1,
        installmentNumber: editingDraft.paymentMethod === 'credito' ? editingDraft.installmentNumber : 1,
        installmentGroupId:
          editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount > 1 ? editingDraft.installmentGroupId : null,
        isInstallment: editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount > 1,
        totalAmount:
          editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount > 1
            ? editingDraft.totalAmount
            : editingDraft.amount
      }

      await financeService.saveCategory(category, safeDraft.type)
      await financeService.updateTransaction(safeDraft)
      setTransactions((prev) => prev.map((item) => (item.id === editingId ? safeDraft : item)))
      setEditingId(null)
      setEditingDraft(null)
      await loadCategories()
      setError('')
    } catch {
      setError('Nao foi possivel editar a transacao.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleCreateSubmit = async (): Promise<void> => {
    const parsedAmount = Number(createForm.amount.replace(',', '.'))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setCreateFeedback('Informe um valor valido maior que zero.')
      return
    }

    if (!createForm.date) {
      setCreateFeedback('Informe a data da transacao.')
      return
    }

    const category = normalizeCategoryValue(createForm.category)
    if (!category) {
      setCreateFeedback('Selecione uma categoria.')
      return
    }

    const description = createForm.description.trim()
    if (!description) {
      setCreateFeedback('Informe a descricao da transacao.')
      return
    }
    const installmentCount = createForm.paymentMethod === 'credito' ? createForm.installmentCount : 1
    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 48) {
      setCreateFeedback('Informe uma quantidade de parcelas entre 1 e 48.')
      return
    }

    const firstDate = new Date(createForm.date)
    if (Number.isNaN(firstDate.getTime())) {
      setCreateFeedback('Informe uma data valida.')
      return
    }

    const isInstallment = createForm.paymentMethod === 'credito' && installmentCount > 1
    const amounts = isInstallment ? splitAmountIntoInstallments(parsedAmount, installmentCount) : [parsedAmount]
    const installmentGroupId = isInstallment ? crypto.randomUUID() : null
    const transactionsToCreate: Transaction[] = amounts.map((amount, index) => {
      const date = isInstallment ? addMonthsKeepingDay(firstDate, index) : firstDate
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const transactionDate = `${year}-${month}-${day}`

      return {
        id: crypto.randomUUID(),
        type: createForm.type,
        amount,
        date: transactionDate,
        category,
        description,
        isConfirmed: getDefaultConfirmedByDate(transactionDate),
        isMonthlyCost: createForm.type === 'saida' ? createForm.isMonthlyCost && !isInstallment : false,
        paymentMethod: createForm.paymentMethod,
        installmentGroupId,
        installmentNumber: isInstallment ? index + 1 : 1,
        installmentCount,
        totalAmount: parsedAmount,
        isInstallment
      }
    })

    setIsCreating(true)
    setCreateFeedback('')

    try {
      await financeService.saveTransactions(transactionsToCreate)
      await financeService.saveCategory(category, createForm.type)
      await Promise.all([loadTransactions(), loadCategories()])
      setCreateForm(initialCreateFormState)
      setNewCategoryName('')
      setIsCreateModalOpen(false)
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Nao foi possivel registrar a transacao no momento.'
      setCreateFeedback(message)
    } finally {
      setIsCreating(false)
    }
  }

  const getExportPeriodLabel = (): string => {
    if (exportForm.periodType === 'year') {
      return `Ano: ${exportForm.year}`
    }

    if (exportForm.periodType === 'month') {
      const monthLabel = MONTH_LABELS[exportForm.month] ?? exportForm.month
      return `Mes: ${monthLabel}/${exportForm.year}`
    }

    const monthLabel = MONTH_LABELS[exportForm.month] ?? exportForm.month
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

    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
    const companyName =
      typeof meta.company_name === 'string' && meta.company_name.trim()
        ? meta.company_name.trim()
        : 'Empresa nao informada'

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
      dashboardMetrics: [
        { label: 'Receita do periodo', value: formatCurrency(exportTotalEntries) },
        { label: 'Despesa do periodo', value: formatCurrency(exportTotalOutcomes) },
        { label: 'Lucro liquido', value: formatCurrency(exportResultBalance) },
        {
          label: 'Margem',
          value: exportTotalEntries > 0 ? `${((exportResultBalance / exportTotalEntries) * 100).toFixed(2)}%` : 'N/D'
        }
      ]
    }

    setIsExporting(true)
    setError('')
    setExportFeedback('')

    try {
      await financeService.exportReportPdf(payload)
      setIsExportModalOpen(false)
    } catch {
      setExportFeedback('Nao foi possivel exportar o relatorio em PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCreateCategory = async (
    type: TransactionType,
    options?: {
      onSaved?: (name: string) => void
    }
  ): Promise<void> => {
    const normalizedName = normalizeCategoryValue(newCategoryName)
    if (!normalizedName) {
      setCreateFeedback('Informe um nome valido para a categoria.')
      setCategoryFeedback('Informe um nome valido para a categoria.')
      return
    }

    setIsSavingCategory(true)
    setCreateFeedback('')
    setCategoryFeedback('')

    try {
      await financeService.saveCategory(normalizedName, type)
      await loadCategories()
      options?.onSaved?.(normalizedName)
      setNewCategoryName('')
    } catch {
      setCreateFeedback('Nao foi possivel salvar a categoria.')
      setCategoryFeedback('Nao foi possivel salvar a categoria.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handleUpdateCategory = async (categoryId: string): Promise<void> => {
    const normalizedName = normalizeCategoryValue(editingCategoryName)
    if (!normalizedName) {
      setCategoryFeedback('Informe um nome valido para a categoria.')
      return
    }

    setCategoryUpdatingId(categoryId)
    setCategoryFeedback('')
    try {
      await financeService.updateCategory(categoryId, normalizedName, categoryType)
      await loadCategories()
      setEditingCategoryId(null)
      setEditingCategoryName('')
      setCategoryFeedback('Categoria atualizada com sucesso.')
    } catch {
      setCategoryFeedback('Nao foi possivel atualizar a categoria.')
    } finally {
      setCategoryUpdatingId(null)
    }
  }

  const handleDeleteCategory = async (categoryId: string): Promise<void> => {
    setCategoryDeletingId(categoryId)
    setCategoryFeedback('')
    try {
      await financeService.deleteCategory(categoryId)
      await loadCategories()
      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null)
        setEditingCategoryName('')
      }
      setCategoryFeedback('Categoria excluida com sucesso.')
    } catch {
      setCategoryFeedback('Nao foi possivel excluir a categoria.')
    } finally {
      setCategoryDeletingId(null)
    }
  }

  const handleOpenCreateTransaction = (): void => {
    setCreateFeedback('')
    setNewCategoryName('')
    setCreateForm((prev) => ({
      ...prev,
      category: categoryOptions[prev.type][0]?.name ?? ''
    }))
    setIsCreateModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  const handleOpenCategories = (): void => {
    setCategoryType('saida')
    setCategoryFeedback('')
    setNewCategoryName('')
    setIsCreateCategoryOpen(false)
    setEditingCategoryId(null)
    setEditingCategoryName('')
    setIsCategoryModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  const handleOpenExportModal = (): void => {
    setExportFeedback('')
    setExportForm((prev) => ({
      ...prev,
      year: exportYearOptions[0] ?? prev.year,
      day: exportDayOptions[0] ?? prev.day
    }))
    setIsExportModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  return (
    <PageTemplate className={styles.page}>
      <PageHeader
        onCreate={handleOpenCreateTransaction}
        onManageCategories={handleOpenCategories}
        onExport={handleOpenExportModal}
        onOpenMobileActions={() => setIsMobileActionsDrawerOpen(true)}
        isExporting={isExporting}
        disabled={isLoading}
      />

      {isMobileActionsDrawerOpen ? (
        <div className={styles.mobileActionsDrawerOverlay} onClick={() => setIsMobileActionsDrawerOpen(false)}>
          <aside
            className={styles.mobileActionsDrawer}
            role="dialog"
            aria-label="Acoes do relatorio"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileActionsDrawerHeader}>
              <strong>Acoes</strong>
              <button
                type="button"
                className={styles.mobileActionsDrawerClose}
                aria-label="Fechar menu de acoes"
                onClick={() => setIsMobileActionsDrawerOpen(false)}
              >
                <FiX />
              </button>
            </div>
            <div className={styles.mobileActionsDrawerButtons}>
              <Button type="button" variant="secondary" onClick={handleOpenCreateTransaction}>
                Nova transacao
              </Button>
              <Button type="button" variant="ghost" onClick={handleOpenCategories}>
                Categorias
              </Button>
              <ButtonLoading
                type="button"
                variant="primary"
                loading={isExporting}
                disabled={isLoading}
                onClick={handleOpenExportModal}
              >
                Exportar relatorio
              </ButtonLoading>
            </div>
          </aside>
        </div>
      ) : null}

      <div className={styles.searchFilterBar}>
        <label className={styles.searchInputWrap}>
          <FiSearch />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar por nome, valor ou descricao"
          />
        </label>
        <button
          type="button"
          className={`${styles.filterIconButton} ${hasActiveCombinedFilter ? styles.filterIconButtonActive : ''}`.trim()}
          aria-label="Abrir filtros"
          onClick={() => {
            setDraftCombinedFilter({
              selectedYear,
              selectedMonth,
              selectedDay,
              operationType: appliedListFilter.operationType,
              maxAmountLimit: appliedListFilter.maxAmountLimit
            })
            setIsListFilterModalOpen(true)
          }}
        >
          <FiFilter />
        </button>
        {hasActiveCombinedFilter ? (
          <Button type="button" variant="ghost" className={styles.clearFilterButton} onClick={handleClearListFilter}>
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {isLoading && <LoadingState label="Carregando transacoes..." />}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && (
        <>
            <div
              className={`${styles.resultHeader} ${
                resultBalance >= 0 ? styles.resultHeaderPositive : styles.resultHeaderNegative
              }`.trim()}
            >
              <span>Resultado</span>
              <strong className={resultBalance >= 0 ? styles.resultPositive : styles.resultNegative}>
                {formatCurrency(resultBalance)}
              </strong>
            </div>

          <div className={styles.grid}>
            <TransactionsTable
              title="Entradas"
              totalLabel={formatCurrency(totalEntries)}
              totalTone="entrada"
              transactions={entries}
              emptyMessage="Sem entradas até hoje."
              categoryOptions={categoryOptions.entrada.map((item) => item.name)}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditCancel={handleEditCancel}
              onEditChange={handleEditChange}
              onEditSave={handleEditSave}
              deletingId={deletingId}
              editingId={editingId}
              editingDraft={editingDraft}
              isSavingEdit={isSavingEdit}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
            <TransactionsTable
              title="Saidas"
              totalLabel={formatCurrency(totalOutcomes)}
              totalTone="saida"
              transactions={outcomes}
              emptyMessage="Sem saídas até hoje."
              categoryOptions={categoryOptions.saida.map((item) => item.name)}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditCancel={handleEditCancel}
              onEditChange={handleEditChange}
              onEditSave={handleEditSave}
              deletingId={deletingId}
              editingId={editingId}
              editingDraft={editingDraft}
              isSavingEdit={isSavingEdit}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
            <TransactionsTable
              title="Entradas futuras"
              totalLabel={formatCurrency(totalFutureEntries)}
              totalTone="entrada"
              transactions={futureEntries}
              emptyMessage="Sem entradas futuras."
              categoryOptions={categoryOptions.entrada.map((item) => item.name)}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditCancel={handleEditCancel}
              onEditChange={handleEditChange}
              onEditSave={handleEditSave}
              deletingId={deletingId}
              editingId={editingId}
              editingDraft={editingDraft}
              isSavingEdit={isSavingEdit}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              variant="future"
            />
            <TransactionsTable
              title="Saidas futuras"
              totalLabel={formatCurrency(totalFutureOutcomes)}
              totalTone="saida"
              transactions={futureOutcomes}
              emptyMessage="Sem saídas futuras."
              categoryOptions={categoryOptions.saida.map((item) => item.name)}
              onDelete={handleDelete}
              onEditStart={handleEditStart}
              onEditCancel={handleEditCancel}
              onEditChange={handleEditChange}
              onEditSave={handleEditSave}
              deletingId={deletingId}
              editingId={editingId}
              editingDraft={editingDraft}
              isSavingEdit={isSavingEdit}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              variant="future"
            />
          </div>

        </>
      )}

      <ModalBase
        open={isListFilterModalOpen}
        title="Filtros"
        onClose={() => setIsListFilterModalOpen(false)}
      >
        <form
          className={styles.listFilterForm}
          onSubmit={(event) => {
            event.preventDefault()
            handleApplyListFilter()
          }}
        >
          <div className={styles.listFilterAmountGrid}>
            <label className={styles.createField}>
              <span>Ano</span>
              <select
                value={draftCombinedFilter.selectedYear}
                onChange={(event) =>
                  setDraftCombinedFilter((prev) => ({
                    ...prev,
                    selectedYear: event.target.value,
                    selectedDay: 'all'
                  }))
                }
              >
                <option value="all">Todos os anos</option>
                {yearOptions
                  .filter((year) => year !== 'all')
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>
            </label>

            <label className={styles.createField}>
              <span>Mes</span>
              <select
                value={draftCombinedFilter.selectedMonth}
                onChange={(event) =>
                  setDraftCombinedFilter((prev) => ({
                    ...prev,
                    selectedMonth: event.target.value,
                    selectedDay: 'all'
                  }))
                }
              >
                {Object.entries(MONTH_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.createField}>
              <span>Dia</span>
              <select
                value={draftCombinedFilter.selectedDay}
                onChange={(event) =>
                  setDraftCombinedFilter((prev) => ({
                    ...prev,
                    selectedDay: event.target.value
                  }))
                }
              >
                <option value="all">Todos os dias</option>
                {combinedFilterDayOptions
                  .filter((day) => day !== 'all')
                  .map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <label className={styles.createField}>
            <span>Tipo de operacao</span>
            <select
              value={draftCombinedFilter.operationType}
              onChange={(event) =>
                setDraftCombinedFilter((prev) => ({
                  ...prev,
                  operationType: event.target.value as ListFilterState['operationType']
                }))
              }
            >
              <option value="all">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
            </select>
          </label>

          <div className={styles.valueRangeField}>
            <div className={styles.valueRangeHeader}>
              <span>Faixa de valor</span>
              <strong>
                {formatCurrency(0)} ate{' '}
                {formatCurrency(
                  draftCombinedFilter.maxAmountLimit.trim() === ''
                    ? amountRangeMax
                    : Number(draftCombinedFilter.maxAmountLimit)
                )}
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max={String(amountRangeMax)}
              step="10"
              value={
                draftCombinedFilter.maxAmountLimit.trim() === ''
                  ? String(amountRangeMax)
                  : draftCombinedFilter.maxAmountLimit
              }
              onChange={(event) =>
                setDraftCombinedFilter((prev) => ({
                  ...prev,
                  maxAmountLimit: event.target.value
                }))
              }
            />
            <div className={styles.valueRangeScale}>
              <span>{formatCurrency(0)}</span>
              <span>{formatCurrency(amountRangeMax)}</span>
            </div>
          </div>

          <div className={styles.createActions}>
            <Button type="button" variant="ghost" onClick={handleClearListFilter}>
              Limpar
            </Button>
            <Button type="submit">Aplicar filtros</Button>
          </div>
        </form>
      </ModalBase>

      <ModalBase
        open={deleteCandidate !== null}
        title="Confirmar exclusao"
        onClose={() => {
          if (deletingId !== null) return
          setDeleteCandidate(null)
        }}
      >
        <div className={styles.confirmDeleteContent}>
          <p>
            Deseja apagar esta transacao?
          </p>
          {deleteCandidate?.installmentCount && deleteCandidate.installmentCount > 1 ? (
            <p className={styles.confirmDeleteWarning}>
              Esta transacao faz parte de um parcelamento. Ao confirmar, todas as parcelas desse grupo serao apagadas.
            </p>
          ) : null}

          <div className={styles.createActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteCandidate(null)}
              disabled={deletingId !== null}
            >
              Cancelar
            </Button>
            <ButtonLoading
              type="button"
              variant="danger"
              loading={deletingId !== null}
              onClick={() => {
                void handleConfirmDelete()
              }}
            >
              Confirmar exclusao
            </ButtonLoading>
          </div>
        </div>
      </ModalBase>

      <ModalBase
        open={isExportModalOpen}
        title="Exportar relatorio"
        onClose={() => {
          if (isExporting) return
          setIsExportModalOpen(false)
          setExportFeedback('')
        }}
      >
        <form
          className={styles.exportForm}
          onSubmit={(event) => {
            event.preventDefault()
            void handleExportReport()
          }}
        >
          <label className={styles.createField}>
            <span>Nome do arquivo</span>
            <input
              type="text"
              value={exportForm.fileName}
              onChange={(event) => setExportForm((prev) => ({ ...prev, fileName: event.target.value }))}
              placeholder="relatorio-financeiro"
            />
          </label>

          <label className={styles.createField}>
            <span>Periodo de exportacao</span>
            <select
              value={exportForm.periodType}
              onChange={(event) =>
                setExportForm((prev) => ({
                  ...prev,
                  periodType: event.target.value as ExportFormState['periodType']
                }))
              }
            >
              <option value="year">Ano</option>
              <option value="month">Mes</option>
              <option value="day">Dia</option>
            </select>
          </label>

          <div className={styles.exportPeriodGrid}>
            <label className={styles.createField}>
              <span>Ano</span>
              <select
                value={exportForm.year}
                onChange={(event) => setExportForm((prev) => ({ ...prev, year: event.target.value }))}
              >
                {exportYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            {exportForm.periodType !== 'year' ? (
              <label className={styles.createField}>
                <span>Mes</span>
                <select
                  value={exportForm.month}
                  onChange={(event) => setExportForm((prev) => ({ ...prev, month: event.target.value }))}
                >
                  {Object.entries(MONTH_LABELS)
                    .filter(([value]) => value !== 'all')
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}

            {exportForm.periodType === 'day' ? (
              <label className={styles.createField}>
                <span>Dia</span>
                <select
                  value={exportForm.day}
                  onChange={(event) => setExportForm((prev) => ({ ...prev, day: event.target.value }))}
                >
                  {exportDayOptions.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className={styles.exportPreview}>
            <p><strong>Entradas:</strong> {formatCurrency(exportTotalEntries)}</p>
            <p><strong>Saidas:</strong> {formatCurrency(exportTotalOutcomes)}</p>
            <p><strong>Resultado:</strong> {formatCurrency(exportResultBalance)}</p>
          </div>

          {exportFeedback ? <p className={styles.createFeedback}>{exportFeedback}</p> : null}

          <div className={styles.createActions}>
            <Button type="button" variant="ghost" onClick={() => setIsExportModalOpen(false)} disabled={isExporting}>
              Cancelar
            </Button>
            <ButtonLoading type="submit" loading={isExporting}>
              Gerar PDF
            </ButtonLoading>
          </div>
        </form>
      </ModalBase>

      <ModalBase
        open={isCreateModalOpen}
        title="Nova transacao"
        onClose={() => {
          if (isCreating) return
          setIsCreateModalOpen(false)
          setCreateFeedback('')
          setNewCategoryName('')
        }}
      >
        <form
          className={styles.createForm}
          onSubmit={(event) => {
            event.preventDefault()
            void handleCreateSubmit()
          }}
        >
          <label className={`${styles.createField} ${styles.createFieldType}`}>
            <span>Tipo</span>
            <select
              value={createForm.type}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  type: event.target.value as Transaction['type'],
                  category: '',
                  isMonthlyCost: event.target.value === 'saida' ? prev.isMonthlyCost : false,
                  paymentMethod: event.target.value === 'saida' ? prev.paymentMethod : 'pix',
                  installmentCount:
                    event.target.value === 'saida' && prev.paymentMethod === 'credito' ? prev.installmentCount : 1
                }))
              }
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
            </select>
          </label>

          {createForm.type === 'saida' ? (
            <label className={`${styles.createCheck} ${styles.createFieldFull}`}>
              <input
                type="checkbox"
                checked={createForm.isMonthlyCost}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, isMonthlyCost: event.target.checked }))}
              />
              <span>Marcar como custo mensal</span>
            </label>
          ) : null}

          <label className={styles.createField}>
            <span>Valor</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={createForm.amount}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder="0.00"
            />
          </label>

          <label className={styles.createField}>
            <span>Data</span>
            <input type="date" value={createForm.date} onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))} />
          </label>

          <label className={styles.createField}>
            <span>Categoria</span>
            <select
              value={createForm.category}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="">Selecione...</option>
              {categoryOptions[createForm.type].map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.createField}>
            <span>Forma de pagamento</span>
            <select
              value={createForm.paymentMethod}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value as PaymentMethod,
                  installmentCount: event.target.value === 'credito' ? prev.installmentCount : 1
                }))
              }
            >
              <option value="pix">Pix</option>
              <option value="debito">Debito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="credito">Credito</option>
            </select>
          </label>

          {createForm.paymentMethod === 'credito' ? (
            <label className={styles.createField}>
              <span>Parcelas</span>
              <input
                type="number"
                min="1"
                max="48"
                step="1"
                value={String(createForm.installmentCount)}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    installmentCount: Math.max(1, Math.min(48, Number(event.target.value) || 1))
                  }))
                }
              />
            </label>
          ) : null}

          <label className={`${styles.createField} ${styles.createFieldFull}`}>
            <span>Descricao</span>
            <textarea
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              placeholder="Descreva a transacao"
            />
          </label>

          {createFeedback ? <p className={styles.createFeedback}>{createFeedback}</p> : null}

          <div className={styles.createActions}>
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <ButtonLoading type="submit" loading={isCreating}>
              Salvar transacao
            </ButtonLoading>
          </div>
        </form>
      </ModalBase>

      <ModalBase
        open={isCategoryModalOpen}
        title="Gerenciar categorias"
        onClose={() => {
          if (categoryUpdatingId !== null || categoryDeletingId !== null || isSavingCategory) return
          setIsCategoryModalOpen(false)
          setCategoryFeedback('')
          setIsCreateCategoryOpen(false)
          setEditingCategoryId(null)
          setEditingCategoryName('')
        }}
      >
        <div className={styles.categoryManager}>
          <div className={styles.categoryTopBar}>
            <label className={styles.createField}>
              <span>Tipo</span>
              <select
                value={categoryType}
                onChange={(event) => {
                  setCategoryType(event.target.value as TransactionType)
                  setIsCreateCategoryOpen(false)
                  setEditingCategoryId(null)
                  setEditingCategoryName('')
                  setCategoryFeedback('')
                }}
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
              </select>
            </label>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateCategoryOpen((prev) => !prev)
                setCategoryFeedback('')
              }}
            >
              {isCreateCategoryOpen ? 'Cancelar nova categoria' : 'Criar nova categoria'}
            </Button>
          </div>

          {isCreateCategoryOpen ? (
            <label className={styles.createField}>
              <span>Nova categoria</span>
              <div className={styles.categoryInline}>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Ex: Alimentacao"
                />
                <ButtonLoading
                  type="button"
                  loading={isSavingCategory}
                  onClick={() => void handleCreateCategory(categoryType)}
                >
                  Adicionar
                </ButtonLoading>
              </div>
            </label>
          ) : null}

          <div className={styles.categoryList}>
            {categoryOptions[categoryType].length === 0 ? (
              <p className={styles.empty}>Nenhuma categoria cadastrada para este tipo.</p>
            ) : (
              categoryOptions[categoryType].map((item) => (
                <article key={item.id} className={styles.categoryItem}>
                  <div className={styles.categoryItemInfo}>
                    {editingCategoryId === item.id ? (
                      <input
                        type="text"
                        className={styles.cellInput}
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                      />
                    ) : (
                      <strong className={styles.categoryName}>{item.name}</strong>
                    )}
                  </div>

                  <div className={styles.categoryActions}>
                    {editingCategoryId === item.id ? (
                      <>
                        <ButtonLoading
                          type="button"
                          loading={categoryUpdatingId === item.id}
                          disabled={!editingCategoryName.trim() || categoryDeletingId === item.id}
                          onClick={() => void handleUpdateCategory(item.id)}
                        >
                          Salvar
                        </ButtonLoading>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={categoryUpdatingId === item.id}
                          onClick={() => {
                            setEditingCategoryId(null)
                            setEditingCategoryName('')
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={categoryDeletingId === item.id}
                          onClick={() => {
                            setEditingCategoryId(item.id)
                            setEditingCategoryName(item.name)
                          }}
                        >
                          Editar
                        </Button>
                        <ButtonLoading
                          type="button"
                          variant="danger"
                          loading={categoryDeletingId === item.id}
                          disabled={categoryUpdatingId === item.id}
                          onClick={() => void handleDeleteCategory(item.id)}
                        >
                          Apagar
                        </ButtonLoading>
                      </>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          {categoryFeedback ? <p className={styles.createFeedback}>{categoryFeedback}</p> : null}
        </div>
      </ModalBase>
    </PageTemplate>
  )
}

