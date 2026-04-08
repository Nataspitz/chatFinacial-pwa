import type { Transaction } from '../../../types/transaction.types'
import type { EditField } from './transactions-table.types'

export const getCategorySelectOptions = (
  categoryOptions: string[],
  currentCategory: string
): string[] => {
  const normalizedCurrent = currentCategory.trim()
  if (!normalizedCurrent) {
    return categoryOptions
  }

  return categoryOptions.includes(normalizedCurrent)
    ? categoryOptions
    : [normalizedCurrent, ...categoryOptions]
}

export const formatPaymentMethod = (value: Transaction['paymentMethod']): string => {
  if (value === 'credito') return 'Credito'
  if (value === 'debito') return 'Debito'
  if (value === 'dinheiro') return 'Dinheiro'
  return 'Pix'
}

export const getMonthlyCostValue = (
  editingDraft: Transaction | null,
  isEditing: boolean,
  onEditChange: (field: EditField, value: string | boolean) => void,
  transaction: Transaction
): JSX.Element | string => {
  if (isEditing && editingDraft) {
    if (editingDraft.type !== 'saida') {
      return '-'
    }

    return (
      <input
        type="checkbox"
        checked={editingDraft.isMonthlyCost}
        onChange={(event) => onEditChange('isMonthlyCost', event.target.checked)}
      />
    )
  }

  if (transaction.type !== 'saida') {
    return '-'
  }

  return transaction.isMonthlyCost ? 'Sim' : 'Nao'
}

export const getConfirmedValue = (
  editingDraft: Transaction | null,
  isEditing: boolean,
  onEditChange: (field: EditField, value: string | boolean) => void,
  transaction: Transaction
): JSX.Element | string => {
  if (isEditing && editingDraft) {
    return (
      <input
        type="checkbox"
        checked={editingDraft.isConfirmed}
        onChange={(event) => onEditChange('isConfirmed', event.target.checked)}
      />
    )
  }

  return transaction.isConfirmed ? 'Sim' : 'Nao'
}
