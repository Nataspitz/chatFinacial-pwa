import { useMemo, useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { ContentCard } from '../../../components/organisms/ContentCard/ContentCard'
import { TransactionsDesktopTable } from './TransactionsDesktopTable'
import { TransactionsMobileList } from './TransactionsMobileList'
import type { TransactionActionContext, TransactionsTableProps } from './transactions-table.types'
import styles from '../Report.module.css'

export const TransactionsTable = ({
  title,
  totalLabel,
  totalTone = 'neutral',
  transactions,
  categoryOptions,
  onDelete,
  onEditStart,
  onEditCancel,
  onEditChange,
  onEditSave,
  deletingId,
  editingId,
  editingDraft,
  isSavingEdit,
  formatCurrency,
  formatDate,
  emptyMessage = 'Nenhuma transacao encontrada.',
  variant = 'default'
}: TransactionsTableProps): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(true)

  const actionContext = useMemo<TransactionActionContext>(() => ({
    deletingId,
    isSavingEdit,
    onDelete,
    onEditCancel,
    onEditSave,
    onEditStart
  }), [deletingId, isSavingEdit, onDelete, onEditCancel, onEditSave, onEditStart])

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
            transactions={transactions}
          />
        </>
      )}
    </ContentCard>
  )
}
