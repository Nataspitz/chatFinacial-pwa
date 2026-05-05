import { useState } from 'react'
import { financeService } from '../../../services/finance.service'
import type { Transaction } from '../../../types/transaction.types'

export const useSettingsTrash = () => {
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([])
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<string[]>([])
  const [isLoadingTrash, setIsLoadingTrash] = useState(false)
  const [isRestoringTrash, setIsRestoringTrash] = useState(false)
  const [isClearingTrash, setIsClearingTrash] = useState(false)
  const [trashFeedback, setTrashFeedback] = useState('')

  const loadDeletedTransactions = async (): Promise<void> => {
    setIsLoadingTrash(true)
    try {
      setDeletedTransactions(await financeService.getDeletedTransactions())
    } catch {
      setTrashFeedback('Não foi possível carregar a lixeira.')
    } finally {
      setIsLoadingTrash(false)
    }
  }

  const handleOpenTrashModal = (): void => {
    setTrashFeedback('')
    setSelectedDeletedIds([])
    setIsTrashModalOpen(true)
    void loadDeletedTransactions()
  }

  const handleToggleDeleted = (id: string): void => {
    setSelectedDeletedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleToggleAllDeleted = (): void => {
    setSelectedDeletedIds((prev) => (prev.length === deletedTransactions.length ? [] : deletedTransactions.map((item) => item.id)))
  }

  const handleRestoreDeleted = async (): Promise<void> => {
    setIsRestoringTrash(true)
    setTrashFeedback('')
    try {
      const restoredCount = selectedDeletedIds.length > 0
        ? await financeService.restoreDeletedTransactionsByIds(selectedDeletedIds)
        : await financeService.restoreDeletedTransactions()
      setSelectedDeletedIds([])
      await loadDeletedTransactions()
      setTrashFeedback(restoredCount > 0 ? `${restoredCount} transações foram recuperadas.` : 'Nenhuma transação para recuperar.')
    } catch {
      setTrashFeedback('Não foi possível recuperar os itens selecionados.')
    } finally {
      setIsRestoringTrash(false)
    }
  }

  const handlePurgeDeleted = async (): Promise<void> => {
    setIsClearingTrash(true)
    setTrashFeedback('')
    try {
      const deletedCount = await financeService.purgeDeletedTransactions()
      setSelectedDeletedIds([])
      await loadDeletedTransactions()
      setTrashFeedback(deletedCount > 0 ? `${deletedCount} transações foram removidas definitivamente.` : 'Nenhuma transação para limpar.')
    } catch {
      setTrashFeedback('Não foi possível limpar a lixeira.')
    } finally {
      setIsClearingTrash(false)
    }
  }

  return {
    isTrashModalOpen,
    setIsTrashModalOpen,
    deletedTransactions,
    selectedDeletedIds,
    isLoadingTrash,
    isRestoringTrash,
    isClearingTrash,
    trashFeedback,
    setTrashFeedback,
    handleOpenTrashModal,
    handleToggleDeleted,
    handleToggleAllDeleted,
    handleRestoreDeleted,
    handlePurgeDeleted
  }
}
