import { useState } from 'react'
import { financeService } from '../../../services/finance.service'
import type { TransactionType } from '../../../types/transaction.types'
import { normalizeCategoryValue } from '../components/report-page.utils'

interface UseReportCategoriesParams {
  loadCategories: () => Promise<void>
  setCreateFeedback: (message: string) => void
}

export const useReportCategories = ({ loadCategories, setCreateFeedback }: UseReportCategoriesParams) => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryType, setCategoryType] = useState<TransactionType>('saida')
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryFeedback, setCategoryFeedback] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null)
  const [categoryDeletingId, setCategoryDeletingId] = useState<string | null>(null)

  const handleCreateCategory = async (
    type: TransactionType,
    options?: { onSaved?: (name: string) => void }
  ): Promise<void> => {
    const normalizedName = normalizeCategoryValue(newCategoryName)
    if (!normalizedName) {
      setCreateFeedback('Informe um nome válido para a categoria.')
      setCategoryFeedback('Informe um nome válido para a categoria.')
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
      setCreateFeedback('Não foi possível salvar a categoria.')
      setCategoryFeedback('Não foi possível salvar a categoria.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handleUpdateCategory = async (categoryId: string): Promise<void> => {
    const normalizedName = normalizeCategoryValue(editingCategoryName)
    if (!normalizedName) {
      setCategoryFeedback('Informe um nome válido para a categoria.')
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
      setCategoryFeedback('Não foi possível atualizar a categoria.')
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
      setCategoryFeedback('Categoria excluída com sucesso.')
    } catch {
      setCategoryFeedback('Não foi possível excluir a categoria.')
    } finally {
      setCategoryDeletingId(null)
    }
  }

  const resetCategoryModal = (): void => {
    setIsCategoryModalOpen(false)
    setCategoryFeedback('')
    setIsCreateCategoryOpen(false)
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  return {
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    categoryType,
    setCategoryType,
    isCreateCategoryOpen,
    setIsCreateCategoryOpen,
    editingCategoryId,
    setEditingCategoryId,
    editingCategoryName,
    setEditingCategoryName,
    categoryFeedback,
    setCategoryFeedback,
    newCategoryName,
    setNewCategoryName,
    isSavingCategory,
    categoryUpdatingId,
    categoryDeletingId,
    handleCreateCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    resetCategoryModal
  }
}
