import type { Transaction } from '../../../types/transaction.types'
import { TransactionMobileItem } from './TransactionMobileItem'
import type { EditField, TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionsMobileListProps {
  actionContext: TransactionActionContext
  categoryOptions: string[]
  editingDraft: Transaction | null
  editingId: string | null
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onEditChange: (field: EditField, value: string | boolean) => void
  transactions: Transaction[]
}

export const TransactionsMobileList = ({
  actionContext,
  categoryOptions,
  editingDraft,
  editingId,
  formatCurrency,
  formatDate,
  onEditChange,
  transactions
}: TransactionsMobileListProps): JSX.Element => {
  return (
    <div className={styles.mobileList}>
      {transactions.map((transaction) => (
        <TransactionMobileItem
          key={transaction.id}
          transaction={transaction}
          actionContext={actionContext}
          categoryOptions={categoryOptions}
          editingDraft={editingDraft}
          editingId={editingId}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onEditChange={onEditChange}
        />
      ))}
    </div>
  )
}
