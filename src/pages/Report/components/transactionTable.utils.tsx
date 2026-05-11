import type { Transaction } from '../../../types/transaction.types'
import type { EditField } from './transactions-table.types'

const normalizeDate = (value: string): string | null => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null

const formatConfirmedAt = (value?: string | null): string => {
  if (!value) return 'data nao registrada'

  const normalized = normalizeDate(value)
  if (normalized) {
    const [year, month, day] = normalized.split('-').map(Number)
    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

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
  if (value === 'credito') return 'Crédito'
  if (value === 'debito') return 'Débito'
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
      <span>
        <input
          type="checkbox"
          checked={editingDraft.isConfirmed}
          onChange={(event) => onEditChange('isConfirmed', event.target.checked)}
        />
        {editingDraft.isConfirmed ? <small>Confirmada em {formatConfirmedAt(editingDraft.confirmedAt)}</small> : null}
      </span>
    )
  }

  return transaction.isConfirmed ? (
    <span>
      Sim
      <small>Confirmada em {formatConfirmedAt(transaction.confirmedAt)}</small>
    </span>
  ) : 'Nao'
}
