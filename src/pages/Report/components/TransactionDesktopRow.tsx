import type { MouseEvent } from 'react'
import { FiMoreVertical } from 'react-icons/fi'
import { Button, ButtonLoading } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import { getTransactionStatusLabel, isRefundedOrCanceled } from '../../../utils/transaction-reports'
import {
  formatPaymentMethod,
  getCategorySelectOptions,
  getConfirmedValue,
  getMonthlyCostValue
} from './transactionTable.utils'
import type { EditField, OpenTransactionContextMenu, TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionDesktopRowProps {
  actionContext: TransactionActionContext
  categoryOptions: string[]
  editingDraft: Transaction | null
  editingId: string | null
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onEditChange: (field: EditField, value: string | boolean) => void
  onOpenContextMenu: OpenTransactionContextMenu
  transaction: Transaction
}

export const TransactionDesktopRow = ({
  actionContext,
  categoryOptions,
  editingDraft,
  editingId,
  formatCurrency,
  formatDate,
  onEditChange,
  onOpenContextMenu,
  transaction
}: TransactionDesktopRowProps): JSX.Element => {
  const isEditing = editingId === transaction.id && editingDraft !== null
  const canShowActions = !isEditing && !actionContext.isActionLocked(transaction)
  const statusLabel = getTransactionStatusLabel(transaction)
  const hasZeroImpact = isRefundedOrCanceled(transaction)

  const handleOpenMenu = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()

    const buttonRect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX || buttonRect.left + buttonRect.width / 2
    const y = event.clientY || buttonRect.top + buttonRect.height / 2

    onOpenContextMenu(transaction, {
      x,
      y
    })
  }

  return (
    <tr data-transaction-id={transaction.id} className={hasZeroImpact ? styles.transactionVoided : undefined}>
      <td>
        {isEditing ? (
          <input
            type="date"
            className={styles.cellInput}
            value={editingDraft.date}
            onChange={(event) => onEditChange('date', event.target.value)}
          />
        ) : (
          formatDate(transaction.date)
        )}
      </td>
      <td>
        {isEditing ? (
          <select
            className={styles.cellInput}
            value={editingDraft.category}
            onChange={(event) => onEditChange('category', event.target.value)}
          >
            {getCategorySelectOptions(categoryOptions, editingDraft.category).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          transaction.category
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="text"
            className={styles.cellInput}
            value={editingDraft.description}
            onChange={(event) => onEditChange('description', event.target.value)}
          />
        ) : (
          <>
            {transaction.description}
            {statusLabel ? <span className={styles.statusBadge}>{statusLabel}</span> : null}
          </>
        )}
      </td>
      <td>
        {isEditing ? (
          <input
            type="number"
            step="0.01"
            min="0"
            className={styles.cellInput}
            value={String(editingDraft.amount)}
            onChange={(event) => onEditChange('amount', event.target.value)}
          />
        ) : (
          <span className={hasZeroImpact ? styles.zeroImpactAmount : undefined}>{formatCurrency(transaction.amount)}</span>
        )}
      </td>
      <td>
        {isEditing ? (
          <select
            className={styles.cellInput}
            value={editingDraft.paymentMethod}
            onChange={(event) => onEditChange('paymentMethod', event.target.value)}
          >
            <option value="pix">Pix</option>
            <option value="debito">Débito</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Crédito</option>
          </select>
        ) : (
          formatPaymentMethod(transaction.paymentMethod)
        )}
      </td>
      <td>
        {isEditing ? (
          editingDraft.paymentMethod === 'credito' ? (
            <input
              type="number"
              min="1"
              max="48"
              step="1"
              className={styles.cellInput}
              value={String(Math.max(1, editingDraft.installmentCount))}
              onChange={(event) => onEditChange('installmentCount', event.target.value)}
            />
          ) : (
            '-'
          )
        ) : transaction.paymentMethod === 'credito' ? (
          `${Math.max(1, transaction.installmentNumber)}/${Math.max(1, transaction.installmentCount)}`
        ) : (
          '-'
        )}
      </td>
      <td>{getConfirmedValue(editingDraft, isEditing, onEditChange, transaction)}</td>
      <td>{getMonthlyCostValue(editingDraft, isEditing, onEditChange, transaction)}
        {isEditing ? (
          <div className={styles.inlineEditActions}>
            <ButtonLoading
              type="button"
              variant="primary"
              className={styles.inlineActionButton}
              loading={actionContext.isSavingEdit}
              onClick={() => {
                void actionContext.onEditSave()
              }}
            >
              Salvar
            </ButtonLoading>
            <Button
              type="button"
              variant="secondary"
              className={styles.inlineActionButton}
              disabled={actionContext.isSavingEdit}
              onClick={actionContext.onEditCancel}
            >
              Cancelar
            </Button>
          </div>
        ) : null}
      </td>
      <td className={styles.rowMenuCell}>
        {canShowActions ? (
          <button
            type="button"
            className={styles.rowMenuButton}
            aria-label="Abrir menu da transação"
            onClick={handleOpenMenu}
          >
            <FiMoreVertical />
          </button>
        ) : null}
      </td>
    </tr>
  )
}
