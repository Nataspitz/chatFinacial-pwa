import type { Transaction } from '../../../types/transaction.types'
import type { EditField } from './transactions-table.types'
import { TransactionsTable } from './TransactionsTable'
import styles from '../Report.module.css'

interface ReportTransactionsGridProps {
  entries: Transaction[]
  outcomes: Transaction[]
  futureEntries: Transaction[]
  futureOutcomes: Transaction[]
  totalEntries: number
  totalOutcomes: number
  totalFutureEntries: number
  totalFutureOutcomes: number
  resultBalance: number
  categoryOptions: {
    entrada: string[]
    saida: string[]
  }
  confirmingId: string | null
  deletingId: string | null
  editingId: string | null
  editingDraft: Transaction | null
  isSavingEdit: boolean
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onDelete: (transaction: Transaction) => Promise<void>
  onConfirmStart: (transaction: Transaction) => void
  onDuplicate: (transaction: Transaction) => void
  onEditStart: (transaction: Transaction) => void
  onEditCancel: () => void
  onEditChange: (field: EditField, value: string | boolean) => void
  onEditSave: () => Promise<void>
  isActionLocked: (transaction: Transaction) => boolean
}

export const ReportTransactionsGrid = ({
  entries,
  outcomes,
  futureEntries,
  futureOutcomes,
  totalEntries,
  totalOutcomes,
  totalFutureEntries,
  totalFutureOutcomes,
  resultBalance,
  categoryOptions,
  confirmingId,
  deletingId,
  editingId,
  editingDraft,
  isSavingEdit,
  formatCurrency,
  formatDate,
  onDelete,
  onConfirmStart,
  onDuplicate,
  onEditStart,
  onEditCancel,
  onEditChange,
  onEditSave,
  isActionLocked
}: ReportTransactionsGridProps): JSX.Element => {
  const commonProps = {
    onDelete,
    onConfirmStart,
    onDuplicate,
    onEditStart,
    onEditCancel,
    onEditChange,
    onEditSave,
    isActionLocked,
    deletingId,
    confirmingId,
    editingId,
    editingDraft,
    isSavingEdit,
    formatCurrency,
    formatDate
  }

  return (
    <>
      <div
        className={`${styles.resultHeader} ${
          resultBalance >= 0 ? styles.resultHeaderPositive : styles.resultHeaderNegative
        }`.trim()}
      >
        <span>Resultado</span>
        <strong className={resultBalance >= 0 ? styles.resultPositive : styles.resultNegative}>
          {formatCurrency(resultBalance)}
        </strong>
      </div>

      <div className={styles.grid}>
        <TransactionsTable
          title="Entradas"
          totalLabel={formatCurrency(totalEntries)}
          totalTone="entrada"
          transactions={entries}
          emptyMessage="Sem entradas até hoje."
          categoryOptions={categoryOptions.entrada}
          {...commonProps}
        />
        <TransactionsTable
          title="Saídas"
          totalLabel={formatCurrency(totalOutcomes)}
          totalTone="saida"
          transactions={outcomes}
          emptyMessage="Sem saídas até hoje."
          categoryOptions={categoryOptions.saida}
          {...commonProps}
        />
        <TransactionsTable
          title="Entradas futuras"
          totalLabel={formatCurrency(totalFutureEntries)}
          totalTone="entrada"
          transactions={futureEntries}
          emptyMessage="Sem entradas futuras."
          categoryOptions={categoryOptions.entrada}
          variant="future"
          {...commonProps}
        />
        <TransactionsTable
          title="Saídas futuras"
          totalLabel={formatCurrency(totalFutureOutcomes)}
          totalTone="saida"
          transactions={futureOutcomes}
          emptyMessage="Sem saídas futuras."
          categoryOptions={categoryOptions.saida}
          variant="future"
          {...commonProps}
        />
      </div>
    </>
  )
}
