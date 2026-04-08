import type { Transaction } from '../../../types/transaction.types'

export type EditField =
  | 'date'
  | 'category'
  | 'description'
  | 'amount'
  | 'isConfirmed'
  | 'isMonthlyCost'
  | 'paymentMethod'

export interface TransactionsTableProps {
  title: string
  totalLabel: string
  totalTone?: 'entrada' | 'saida' | 'neutral'
  transactions: Transaction[]
  emptyMessage?: string
  categoryOptions: string[]
  onDelete: (id: string) => Promise<void>
  onEditStart: (transaction: Transaction) => void
  onEditCancel: () => void
  onEditChange: (field: EditField, value: string | boolean) => void
  onEditSave: () => Promise<void>
  deletingId: string | null
  editingId: string | null
  editingDraft: Transaction | null
  isSavingEdit: boolean
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  variant?: 'default' | 'future'
}

export interface TransactionActionContext {
  deletingId: string | null
  isSavingEdit: boolean
  onDelete: (id: string) => Promise<void>
  onEditCancel: () => void
  onEditSave: () => Promise<void>
  onEditStart: (transaction: Transaction) => void
}
