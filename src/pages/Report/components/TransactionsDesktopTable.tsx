import type { Transaction } from '../../../types/transaction.types'
import { TransactionDesktopRow } from './TransactionDesktopRow'
import type { EditField, TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionsDesktopTableProps {
  actionContext: TransactionActionContext
  categoryOptions: string[]
  editingDraft: Transaction | null
  editingId: string | null
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onEditChange: (field: EditField, value: string | boolean) => void
  transactions: Transaction[]
}

export const TransactionsDesktopTable = ({
  actionContext,
  categoryOptions,
  editingDraft,
  editingId,
  formatCurrency,
  formatDate,
  onEditChange,
  transactions
}: TransactionsDesktopTableProps): JSX.Element => {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <colgroup>
          <col className={styles.colDate} />
          <col className={styles.colCategory} />
          <col className={styles.colDescription} />
          <col className={styles.colValue} />
          <col className={styles.colPaymentMethod} />
          <col className={styles.colInstallment} />
          <col className={styles.colConfirmed} />
          <col className={styles.colMonthlyCost} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th>Data</th>
            <th>Categoria</th>
            <th>Descricao</th>
            <th>Valor</th>
            <th>Pagamento</th>
            <th>Parcela</th>
            <th>Confirmado</th>
            <th>Custo mensal</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionDesktopRow
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
        </tbody>
      </table>
    </div>
  )
}
