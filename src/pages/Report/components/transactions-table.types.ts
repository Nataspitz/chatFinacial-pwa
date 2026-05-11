import type { Transaction } from '../../../types/transaction.types'

export type EditField =
  | 'date'
  | 'category'
  | 'description'
  | 'amount'
  | 'isConfirmed'
  | 'isMonthlyCost'
  | 'paymentMethod'
  | 'installmentCount'

export interface TransactionsTableProps {
  title: string
  totalLabel: string
  totalTone?: 'entrada' | 'saida' | 'neutral'
  transactions: Transaction[]
  emptyMessage?: string
  categoryOptions: string[]
  onConfirmStart: (transaction: Transaction) => void
  onDelete: (id: string) => Promise<void>
  onDuplicate: (transaction: Transaction) => void
  onEditStart: (transaction: Transaction) => void
  onEditCancel: () => void
  onEditChange: (field: EditField, value: string | boolean) => void
  onEditSave: () => Promise<void>
  isActionLocked: (transaction: Transaction) => boolean
  deletingId: string | null
  confirmingId: string | null
  editingId: string | null
  editingDraft: Transaction | null
  isSavingEdit: boolean
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  variant?: 'default' | 'future'
}

export interface TransactionActionContext {
  deletingId: string | null
  confirmingId: string | null
  isSavingEdit: boolean
  onConfirmStart: (transaction: Transaction) => void
  onDelete: (id: string) => Promise<void>
  onDuplicate: (transaction: Transaction) => void
  onEditCancel: () => void
  onEditSave: () => Promise<void>
  onEditStart: (transaction: Transaction) => void
  isActionLocked: (transaction: Transaction) => boolean
}

export interface TransactionContextMenuCoordinates {
  x: number
  y: number
}

export type OpenTransactionContextMenu = (
  transaction: Transaction,
  coordinates: TransactionContextMenuCoordinates
) => void
