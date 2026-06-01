import { useState } from 'react'
import { isFinancialPeriodLocked } from '../../../services/financial-audit-lock'
import { cashPlanningMovementsService } from '../../../services/cash-planning-movements.service'
import { financeService } from '../../../services/finance.service'
import {
  normalizeTransactionBySettings,
  validateTransactionBySettings,
  type TransactionSettings
} from '../../../types/transaction-settings.types'
import type { PaymentMethod, RefundScope, Transaction } from '../../../types/transaction.types'
import { getDefaultTransactionCategory } from '../../../utils/transaction-categories'
import type { EditField } from '../components/transactions-table.types'
import { getTodayDate } from '../components/report-page.date-utils'
import { getErrorMessage, normalizeCategoryValue } from '../components/report-page.utils'
import type { CreateFormState } from '../components/report-page.types'

const notifyFinancialDataUpdated = (): void => {
  window.dispatchEvent(new Event('financial-data-updated'))
}

interface UseReportTransactionActionsParams {
  transactions: Transaction[]
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>
  transactionSettings: TransactionSettings
  loadTransactions: () => Promise<void>
  loadCategories: () => Promise<void>
  loadCashPlanningOptions: () => Promise<void>
  setError: (message: string) => void
  setToastMessage: (message: string) => void
  setCreateForm: React.Dispatch<React.SetStateAction<CreateFormState>>
  setCreateFeedback: (message: string) => void
  setNewCategoryName: (value: string) => void
  setIsCreateModalOpen: (open: boolean) => void
  setIsMobileActionsDrawerOpen: (open: boolean) => void
}

export const useReportTransactionActions = ({
  transactions,
  setTransactions,
  transactionSettings,
  loadTransactions,
  loadCategories,
  loadCashPlanningOptions,
  setError,
  setToastMessage,
  setCreateForm,
  setCreateFeedback,
  setNewCategoryName,
  setIsCreateModalOpen,
  setIsMobileActionsDrawerOpen
}: UseReportTransactionActionsParams) => {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Transaction | null>(null)
  const [confirmCandidate, setConfirmCandidate] = useState<Transaction | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmCashPlanningGoalId, setConfirmCashPlanningGoalId] = useState('')
  const [refundCandidate, setRefundCandidate] = useState<Transaction | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundFeedback, setRefundFeedback] = useState('')
  const [allocationCandidate, setAllocationCandidate] = useState<Transaction | null>(null)
  const [allocationCashPlanningGoalId, setAllocationCashPlanningGoalId] = useState('')
  const [allocationFeedback, setAllocationFeedback] = useState('')
  const [isLoadingAllocation, setIsLoadingAllocation] = useState(false)
  const [isSavingAllocation, setIsSavingAllocation] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Transaction | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const showActionFeedback = (message: string): void => {
    setError('')
    setToastMessage(message)
  }

  const isActionLocked = (transaction: Transaction): boolean => isFinancialPeriodLocked(transaction.date)

  const handleDelete = async (transaction: Transaction): Promise<void> => {
    setDeleteCandidate(transaction)
  }

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteCandidate) return
    const id = deleteCandidate.id
    setDeletingId(id)
    try {
      const isMonthlyCostOccurrenceDelete =
        Boolean(deleteCandidate.isMonthlyCost)
        && Boolean(deleteCandidate.monthlyCostStartDate)
        && deleteCandidate.monthlyCostStartDate !== deleteCandidate.date

      if (isMonthlyCostOccurrenceDelete) {
        await financeService.endMonthlyCostFromDate(deleteCandidate, deleteCandidate.date)
      } else {
        await financeService.deleteTransaction(id)
      }
      await loadTransactions()
      if (editingId === id) {
        setEditingId(null)
        setEditingDraft(null)
      }
      setDeleteCandidate(null)
      notifyFinancialDataUpdated()
      setError('')
      setToastMessage('Transação movida para a lixeira!')
    } catch (deleteError) {
      showActionFeedback(getErrorMessage(deleteError, 'Não foi possível apagar a transação.'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleConfirmStart = (transaction: Transaction): void => {
    if (transaction.isConfirmed) {
      return
    }
    setConfirmCandidate(transaction)
    setConfirmCashPlanningGoalId('')
    setError('')
  }

  const handleConfirmTransaction = async (): Promise<void> => {
    if (!confirmCandidate) return

    const originalTransaction = transactions.find((item) => item.id === confirmCandidate.id)
    const isMonthlyCostOccurrenceEdit =
      Boolean(originalTransaction?.isMonthlyCost)
      && Boolean(confirmCandidate.monthlyCostStartDate)
      && confirmCandidate.monthlyCostStartDate !== confirmCandidate.date

    setConfirmingId(confirmCandidate.id)
    try {
      const confirmedTransaction: Transaction = {
        ...confirmCandidate,
        isConfirmed: true,
        confirmedAt: new Date().toISOString()
      }

      if (isMonthlyCostOccurrenceEdit && originalTransaction) {
        const persistedTransaction = await financeService.updateMonthlyCostFromDate(originalTransaction, confirmedTransaction)
        await cashPlanningMovementsService.applyTransactionAllocation({
          transaction: persistedTransaction,
          goalId: confirmCashPlanningGoalId
        })
        await loadTransactions()
      } else {
        await financeService.confirmTransaction(confirmedTransaction.id)
        await cashPlanningMovementsService.applyTransactionAllocation({
          transaction: confirmedTransaction,
          goalId: confirmCashPlanningGoalId
        })
        setTransactions((prev) => prev.map((item) => (item.id === confirmedTransaction.id ? confirmedTransaction : item)))
      }

      setConfirmCandidate(null)
      setConfirmCashPlanningGoalId('')
      await loadCashPlanningOptions()
      notifyFinancialDataUpdated()
      setError('')
      setToastMessage('Transação validada!')
    } catch (confirmError) {
      showActionFeedback(getErrorMessage(confirmError, 'Não foi possível validar a transação.'))
    } finally {
      setConfirmingId(null)
    }
  }

  const handleEditStart = (transaction: Transaction): void => {
    const installmentCount = transaction.paymentMethod === 'credito' ? Math.max(1, transaction.installmentCount) : 1
    setEditingId(transaction.id)
    setEditingDraft({
      ...transaction,
      installmentCount,
      installmentNumber: transaction.paymentMethod === 'credito' ? transaction.installmentNumber : 1,
      installmentGroupId: transaction.paymentMethod === 'credito' && installmentCount > 1 ? transaction.installmentGroupId : null,
      isInstallment: transaction.paymentMethod === 'credito' && installmentCount > 1,
      isConfirmed: Boolean(transaction.isConfirmed),
      isMonthlyCost: transaction.type === 'saida' ? Boolean(transaction.isMonthlyCost) : false
    })
    setError('')
  }

  const handleDuplicateTransaction = (transaction: Transaction): void => {
    const installmentCount = transaction.paymentMethod === 'credito' ? Math.max(1, transaction.installmentCount) : 1
    const amountToDuplicate = transaction.paymentMethod === 'credito' && installmentCount > 1 ? transaction.totalAmount : transaction.amount
    setCreateFeedback('')
    setNewCategoryName('')
    setError('')
    setEditingId(null)
    setEditingDraft(null)
    setCreateForm({
      type: transaction.type,
      amount: String(amountToDuplicate),
      date: getTodayDate(),
      category: transaction.category || getDefaultTransactionCategory(),
      description: transaction.description,
      isMonthlyCost: transaction.type === 'saida' ? transaction.isMonthlyCost : false,
      paymentMethod: transaction.paymentMethod,
      installmentCount,
      cashPlanningGoalId: ''
    })
    setIsCreateModalOpen(true)
    setIsMobileActionsDrawerOpen(false)
  }

  const handleRefundStart = (transaction: Transaction): void => {
    setRefundCandidate(transaction)
    setRefundFeedback('')
    setError('')
  }

  const handleAllocationStart = async (transaction: Transaction): Promise<void> => {
    setAllocationCandidate(transaction)
    setAllocationCashPlanningGoalId('')
    setAllocationFeedback('')
    setError('')

    if (!transaction.isConfirmed) {
      return
    }

    setIsLoadingAllocation(true)
    try {
      const allocation = await cashPlanningMovementsService.getTransactionAllocation(transaction.id)
      setAllocationCashPlanningGoalId(allocation?.goalId ?? '')
    } catch (allocationError) {
      setAllocationFeedback(getErrorMessage(allocationError, 'Não foi possível carregar a repartição da transação.'))
    } finally {
      setIsLoadingAllocation(false)
    }
  }

  const handleSaveAllocation = async (): Promise<void> => {
    if (!allocationCandidate) return

    setIsSavingAllocation(true)
    setAllocationFeedback('')
    try {
      await cashPlanningMovementsService.saveTransactionAllocation(
        allocationCandidate,
        allocationCashPlanningGoalId || null
      )
      await Promise.all([loadTransactions(), loadCashPlanningOptions()])
      setAllocationCandidate(null)
      setAllocationCashPlanningGoalId('')
      notifyFinancialDataUpdated()
      setError('')
      setToastMessage(allocationCashPlanningGoalId ? 'Repartição vinculada.' : 'Repartição removida.')
    } catch (allocationError) {
      setAllocationFeedback(getErrorMessage(allocationError, 'Não foi possível salvar a repartição da transação.'))
    } finally {
      setIsSavingAllocation(false)
    }
  }

  const handleConfirmRefundTransaction = async (options: {
    mode: 'refunded' | 'canceled'
    reason?: string
    scope?: RefundScope
  }): Promise<void> => {
    if (!refundCandidate) return

    setRefundingId(refundCandidate.id)
    setRefundFeedback('')
    try {
      await financeService.refundTransaction(refundCandidate.id, options)
      await loadTransactions()
      setRefundCandidate(null)
      notifyFinancialDataUpdated()
      setError('')
      setToastMessage(options.mode === 'refunded' ? 'Transação reembolsada.' : 'Transação anulada.')
    } catch (refundError) {
      setRefundFeedback(getErrorMessage(refundError, 'Não foi possível anular ou reembolsar a transação.'))
    } finally {
      setRefundingId(null)
    }
  }

  const handleEditChange = (field: EditField, value: string | boolean): void => {
    if (!editingDraft) return
    if (field === 'amount') {
      const nextAmount = Number(value as string)
      setEditingDraft({ ...editingDraft, amount: Number.isFinite(nextAmount) ? nextAmount : 0 })
      return
    }
    if (field === 'isMonthlyCost' || field === 'isConfirmed') {
      setEditingDraft({ ...editingDraft, [field]: field === 'isMonthlyCost' ? editingDraft.type === 'saida' && Boolean(value) : Boolean(value) })
      return
    }
    if (field === 'paymentMethod') {
      const paymentMethod = value as PaymentMethod
      const nextInstallmentCount = paymentMethod === 'credito' ? Math.max(1, editingDraft.installmentCount) : 1
      setEditingDraft({
        ...editingDraft,
        paymentMethod,
        installmentCount: nextInstallmentCount,
        installmentNumber: paymentMethod === 'credito' ? editingDraft.installmentNumber : 1,
        installmentGroupId: paymentMethod === 'credito' && nextInstallmentCount > 1 ? editingDraft.installmentGroupId ?? crypto.randomUUID() : null,
        isInstallment: paymentMethod === 'credito' && nextInstallmentCount > 1
      })
      return
    }
    if (field === 'installmentCount') {
      const parsed = Number(value as string)
      const nextInstallmentCount = Number.isInteger(parsed) ? Math.min(48, Math.max(1, parsed)) : 1
      setEditingDraft({
        ...editingDraft,
        installmentCount: nextInstallmentCount,
        installmentNumber: 1,
        installmentGroupId: nextInstallmentCount > 1 ? editingDraft.installmentGroupId ?? crypto.randomUUID() : null,
        isInstallment: nextInstallmentCount > 1
      })
      return
    }
    setEditingDraft({ ...editingDraft, [field]: value as string })
  }

  const handleEditSave = async (): Promise<void> => {
    if (!editingDraft || !editingId) return
    const originalTransaction = transactions.find((item) => item.id === editingId)
    const isMonthlyCostOccurrenceEdit =
      Boolean(originalTransaction?.isMonthlyCost)
      && Boolean(editingDraft.monthlyCostStartDate)
      && editingDraft.monthlyCostStartDate !== editingDraft.date
    if (!editingDraft.category.trim() || !editingDraft.description.trim() || editingDraft.amount <= 0 || !editingDraft.date) {
      setError('Preencha os campos da edição com valores válidos.')
      return
    }
    if (editingDraft.paymentMethod === 'credito' && (!Number.isInteger(editingDraft.installmentCount) || editingDraft.installmentCount < 1 || editingDraft.installmentCount > 48)) {
      setError('Informe uma quantidade de parcelas entre 1 e 48 para pagamento no crédito.')
      return
    }
    if (!transactionSettings.allowCreditWithoutInstallments && editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount <= 1) {
      setError('Para pagamento no crédito, configure ao menos 2 parcelas nas regras.')
      return
    }

    setIsSavingEdit(true)
    try {
      const safeDraft: Transaction = {
        ...editingDraft,
        category: normalizeCategoryValue(editingDraft.category),
        description: editingDraft.description.trim(),
        isConfirmed: Boolean(editingDraft.isConfirmed),
        isMonthlyCost: editingDraft.type === 'saida' ? editingDraft.isMonthlyCost : false,
        paymentMethod: editingDraft.paymentMethod,
        installmentCount: editingDraft.paymentMethod === 'credito' ? editingDraft.installmentCount : 1,
        installmentNumber: editingDraft.paymentMethod === 'credito' ? editingDraft.installmentNumber : 1,
        installmentGroupId: editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount > 1 ? editingDraft.installmentGroupId : null,
        isInstallment: editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount > 1,
        totalAmount: editingDraft.paymentMethod === 'credito' && editingDraft.installmentCount > 1 ? editingDraft.totalAmount : editingDraft.amount
      }
      const normalizedDraft = normalizeTransactionBySettings(safeDraft, transactionSettings)
      const validationError = validateTransactionBySettings(normalizedDraft, transactionSettings)
      if (validationError) {
        setError(validationError)
        return
      }
      await financeService.saveCategory(safeDraft.category, normalizedDraft.type)
      if (isMonthlyCostOccurrenceEdit && originalTransaction) {
        await financeService.updateMonthlyCostFromDate(originalTransaction, normalizedDraft)
        await loadTransactions()
      } else {
        await financeService.updateTransaction(normalizedDraft)
        setTransactions((prev) => prev.map((item) => (item.id === editingId ? normalizedDraft : item)))
      }
      setEditingId(null)
      setEditingDraft(null)
      await loadCategories()
      setError('')
      notifyFinancialDataUpdated()
    } catch (editError) {
      showActionFeedback(getErrorMessage(editError, 'Não foi possível editar a transação.'))
    } finally {
      setIsSavingEdit(false)
    }
  }

  return {
    deletingId,
    deleteCandidate,
    setDeleteCandidate,
    confirmingId,
    confirmCandidate,
    setConfirmCandidate,
    confirmCashPlanningGoalId,
    setConfirmCashPlanningGoalId,
    refundCandidate,
    setRefundCandidate,
    refundingId,
    refundFeedback,
    setRefundFeedback,
    allocationCandidate,
    setAllocationCandidate,
    allocationCashPlanningGoalId,
    setAllocationCashPlanningGoalId,
    allocationFeedback,
    setAllocationFeedback,
    isLoadingAllocation,
    isSavingAllocation,
    editingId,
    editingDraft,
    isSavingEdit,
    handleDelete,
    handleConfirmDelete,
    handleConfirmStart,
    handleConfirmTransaction,
    handleRefundStart,
    handleConfirmRefundTransaction,
    handleAllocationStart,
    handleSaveAllocation,
    handleEditStart,
    handleDuplicateTransaction,
    handleEditCancel: () => {
      setEditingId(null)
      setEditingDraft(null)
    },
    handleEditChange,
    handleEditSave,
    isActionLocked
  }
}
