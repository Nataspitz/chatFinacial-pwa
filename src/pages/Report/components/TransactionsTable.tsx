import { useMemo, useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { ContentCard } from '../../../components/organisms/ContentCard/ContentCard'
import type { Transaction } from '../../../types/transaction.types'
import { TransactionContextMenu } from './TransactionContextMenu'
import { TransactionsDesktopTable } from './TransactionsDesktopTable'
import { TransactionsMobileList } from './TransactionsMobileList'
import type {
  TransactionActionContext,
  TransactionContextMenuCoordinates,
  TransactionsTableProps
} from './transactions-table.types'
import styles from '../Report.module.css'

export const TransactionsTable = ({
  title,
  totalLabel,
  totalTone = 'neutral',
  transactions,
  categoryOptions,
  onConfirmStart,
  onDelete,
  onDuplicate,
  onEditStart,
  onEditCancel,
  onEditChange,
  onEditSave,
  deletingId,
  confirmingId,
  editingId,
  editingDraft,
  isSavingEdit,
  formatCurrency,
  formatDate,
  emptyMessage = 'Nenhuma transação encontrada.',
  variant = 'default'
}: TransactionsTableProps): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [contextMenuState, setContextMenuState] = useState<{
    coordinates: TransactionContextMenuCoordinates
    transaction: Transaction
  } | null>(null)

  const closeContextMenu = (): void => {
    setContextMenuState(null)
  }

  const actionContext = useMemo<TransactionActionContext>(() => ({
    confirmingId,
    deletingId,
    isSavingEdit,
    onConfirmStart,
    onDelete,
    onDuplicate,
    onEditCancel,
    onEditSave,
    onEditStart
  }), [confirmingId, deletingId, isSavingEdit, onConfirmStart, onDelete, onDuplicate, onEditCancel, onEditSave, onEditStart])

  const openContextMenu = (
    transaction: Transaction,
    coordinates: TransactionContextMenuCoordinates
  ): void => {
    if (editingId !== null && editingId !== transaction.id) {
      return
    }

    setContextMenuState({
      transaction,
      coordinates
    })
  }

  const handleContextEdit = (): void => {
    if (!contextMenuState) {
      return
    }

    actionContext.onEditStart(contextMenuState.transaction)
    closeContextMenu()
  }

  const handleContextDuplicate = (): void => {
    if (!contextMenuState) {
      return
    }

    actionContext.onDuplicate(contextMenuState.transaction)
    closeContextMenu()
  }

  const handleContextConfirm = (): void => {
    if (!contextMenuState) {
      return
    }

    actionContext.onConfirmStart(contextMenuState.transaction)
    closeContextMenu()
  }

  const handleContextDelete = (): void => {
    if (!contextMenuState) {
      return
    }

    void actionContext.onDelete(contextMenuState.transaction.id)
    closeContextMenu()
  }

  const totalToneClassName =
    totalTone === 'entrada'
      ? styles.sectionTotalEntrada
      : totalTone === 'saida'
        ? styles.sectionTotalSaida
        : ''

  return (
    <ContentCard className={`${styles.section} ${variant === 'future' ? styles.sectionFuture : ''}`.trim()}>
      <button
        type="button"
        className={styles.sectionToggle}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <strong className={`${styles.sectionTotal} ${totalToneClassName}`.trim()}>
            {totalLabel}
          </strong>
        </div>
        <span className={styles.sectionToggleIcon}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</span>
      </button>

      {!isExpanded ? null : transactions.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <>
          <TransactionsDesktopTable
            actionContext={actionContext}
            categoryOptions={categoryOptions}
            editingDraft={editingDraft}
            editingId={editingId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onEditChange={onEditChange}
            onOpenContextMenu={openContextMenu}
            transactions={transactions}
          />

          <TransactionsMobileList
            actionContext={actionContext}
            categoryOptions={categoryOptions}
            editingDraft={editingDraft}
            editingId={editingId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onEditChange={onEditChange}
            onOpenContextMenu={openContextMenu}
            transactions={transactions}
          />

          <TransactionContextMenu
            canConfirm={contextMenuState ? !contextMenuState.transaction.isConfirmed : false}
            coordinates={contextMenuState?.coordinates ?? null}
            isConfirming={Boolean(contextMenuState && confirmingId === contextMenuState.transaction.id)}
            isDeleting={Boolean(contextMenuState && deletingId === contextMenuState.transaction.id)}
            isOpen={contextMenuState !== null}
            onClose={closeContextMenu}
            onConfirm={handleContextConfirm}
            onDelete={handleContextDelete}
            onDuplicate={handleContextDuplicate}
            onEdit={handleContextEdit}
          />
        </>
      )}
    </ContentCard>
  )
}
