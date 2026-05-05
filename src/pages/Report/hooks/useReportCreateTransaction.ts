import { useEffect, useState } from 'react'
import { FINANCIAL_AUDIT_LOCK_MESSAGE, hasLockedFinancialPeriod, isFinancialPeriodLocked } from '../../../services/financial-audit-lock'
import { financeService, type CategoryItem } from '../../../services/finance.service'
import {
  getDefaultConfirmedByType,
  normalizeTransactionBySettings,
  validateTransactionBySettings,
  type TransactionSettings
} from '../../../types/transaction-settings.types'
import type { Transaction, TransactionType } from '../../../types/transaction.types'
import { addMonthsKeepingDay, parseLocalDate } from '../components/report-page.date-utils'
import { initialCreateFormState } from '../components/report-page.forms'
import { normalizeCategoryValue, splitAmountIntoInstallments } from '../components/report-page.utils'
import type { CreateFormState } from '../components/report-page.types'

const notifyFinancialDataUpdated = (): void => {
  window.dispatchEvent(new Event('financial-data-updated'))
}

interface UseReportCreateTransactionParams {
  categoryOptions: Record<TransactionType, CategoryItem[]>
  transactionSettings: TransactionSettings
  loadTransactions: () => Promise<void>
  loadCategories: () => Promise<void>
}

export const useReportCreateTransaction = ({
  categoryOptions,
  transactionSettings,
  loadTransactions,
  loadCategories
}: UseReportCreateTransactionParams) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateFormState)
  const [isCreating, setIsCreating] = useState(false)
  const [createFeedback, setCreateFeedback] = useState('')

  useEffect(() => {
    if (!isCreateModalOpen) return
    const options = categoryOptions[createForm.type]
    if (options.length === 0) return
    if (!createForm.category || !options.some((option) => option.name === createForm.category)) {
      setCreateForm((prev) => ({ ...prev, category: options[0].name }))
    }
  }, [categoryOptions, createForm.category, createForm.type, isCreateModalOpen])

  const handleCreateSubmit = async (): Promise<void> => {
    const parsedAmount = Number(createForm.amount.replace(',', '.'))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setCreateFeedback('Informe um valor válido maior que zero.')
      return
    }
    if (!createForm.date) {
      setCreateFeedback('Informe a data da transação.')
      return
    }
    if (isFinancialPeriodLocked(createForm.date)) {
      setCreateFeedback(FINANCIAL_AUDIT_LOCK_MESSAGE)
      return
    }

    const category = normalizeCategoryValue(createForm.category)
    const description = createForm.description.trim()
    if (!category) {
      setCreateFeedback('Selecione uma categoria.')
      return
    }
    if (!description) {
      setCreateFeedback('Informe a descrição da transação.')
      return
    }

    const installmentCount = createForm.paymentMethod === 'credito' ? createForm.installmentCount : 1
    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 48) {
      setCreateFeedback('Informe uma quantidade de parcelas entre 1 e 48.')
      return
    }
    if (!transactionSettings.allowCreditWithoutInstallments && createForm.paymentMethod === 'credito' && installmentCount <= 1) {
      setCreateFeedback('Para pagamento no crédito, configure ao menos 2 parcelas nas regras.')
      return
    }

    const firstDate = parseLocalDate(createForm.date)
    if (Number.isNaN(firstDate.getTime())) {
      setCreateFeedback('Informe uma data válida.')
      return
    }

    const isInstallment = createForm.paymentMethod === 'credito' && installmentCount > 1
    const amounts = isInstallment ? splitAmountIntoInstallments(parsedAmount, installmentCount) : [parsedAmount]
    const installmentGroupId = isInstallment ? crypto.randomUUID() : null
    const transactionsToCreate: Transaction[] = amounts.map((amount, index) => {
      const date = isInstallment ? addMonthsKeepingDay(firstDate, index) : firstDate
      const transactionDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return {
        id: crypto.randomUUID(),
        type: createForm.type,
        amount,
        date: transactionDate,
        category,
        description,
        isConfirmed: getDefaultConfirmedByType(transactionSettings, createForm.type, transactionDate),
        isMonthlyCost: createForm.type === 'saida' ? createForm.isMonthlyCost && !isInstallment : false,
        paymentMethod: createForm.paymentMethod,
        installmentGroupId,
        installmentNumber: isInstallment ? index + 1 : 1,
        installmentCount,
        totalAmount: parsedAmount,
        isInstallment
      }
    })

    const normalizedTransactions = transactionsToCreate.map((item) => normalizeTransactionBySettings(item, transactionSettings))
    if (hasLockedFinancialPeriod(normalizedTransactions.map((item) => item.date))) {
      setCreateFeedback(FINANCIAL_AUDIT_LOCK_MESSAGE)
      return
    }
    const invalidTransactionMessage = normalizedTransactions
      .map((item) => validateTransactionBySettings(item, transactionSettings))
      .find(Boolean)
    if (invalidTransactionMessage) {
      setCreateFeedback(invalidTransactionMessage)
      return
    }

    setIsCreating(true)
    setCreateFeedback('')
    try {
      await financeService.saveTransactions(normalizedTransactions)
      await financeService.saveCategory(category, createForm.type)
      await Promise.all([loadTransactions(), loadCategories()])
      notifyFinancialDataUpdated()
      setCreateForm(initialCreateFormState)
      setIsCreateModalOpen(false)
    } catch (createError) {
      setCreateFeedback(createError instanceof Error ? createError.message : 'Não foi possível registrar a transação no momento.')
    } finally {
      setIsCreating(false)
    }
  }

  return {
    isCreateModalOpen,
    setIsCreateModalOpen,
    createForm,
    setCreateForm,
    isCreating,
    createFeedback,
    setCreateFeedback,
    handleCreateSubmit
  }
}
