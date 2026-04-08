import type { Transaction } from '../../../types/transaction.types'
import { TransactionActions } from './TransactionActions'
import {
  formatPaymentMethod,
  getCategorySelectOptions,
  getConfirmedValue,
  getMonthlyCostValue
} from './transactionTable.utils'
import type { EditField, TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionDesktopRowProps {
  actionContext: TransactionActionContext
  categoryOptions: string[]
  editingDraft: Transaction | null
  editingId: string | null
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onEditChange: (field: EditField, value: string | boolean) => void
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
  transaction
}: TransactionDesktopRowProps): JSX.Element => {
  const isEditing = editingId === transaction.id && editingDraft !== null

  return (
    <tr>
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
          transaction.description
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
          formatCurrency(transaction.amount)
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
            <option value="debito">Debito</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Credito</option>
          </select>
        ) : (
          formatPaymentMethod(transaction.paymentMethod)
        )}
      </td>
      <td>{transaction.installmentCount > 1 ? `${transaction.installmentNumber}/${transaction.installmentCount}` : '-'}</td>
      <td>{getConfirmedValue(editingDraft, isEditing, onEditChange, transaction)}</td>
      <td>{getMonthlyCostValue(editingDraft, isEditing, onEditChange, transaction)}</td>
      <td className={styles.actionsCell}>
        <TransactionActions context={actionContext} isEditing={isEditing} transaction={transaction} />
      </td>
    </tr>
  )
}
