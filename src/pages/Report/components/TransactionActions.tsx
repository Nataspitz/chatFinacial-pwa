import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { Button, ButtonLoading } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import type { TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionActionsProps {
  context: TransactionActionContext
  isEditing: boolean
  mobile?: boolean
  transaction: Transaction
}

export const TransactionActions = ({
  context,
  isEditing,
  mobile = false,
  transaction
}: TransactionActionsProps): JSX.Element => {
  if (isEditing) {
    return (
      <div className={styles.actionsGroup}>
        <ButtonLoading
          type="button"
          variant="primary"
          className={styles.actionButton}
          loading={context.isSavingEdit}
          onClick={() => {
            void context.onEditSave()
          }}
        >
          Salvar
        </ButtonLoading>
        <Button
          type="button"
          variant="secondary"
          className={styles.actionButton}
          disabled={context.isSavingEdit}
          onClick={context.onEditCancel}
        >
          Cancelar
        </Button>
      </div>
    )
  }

  if (mobile) {
    return (
      <div className={styles.actionsGroup}>
        <Button
          type="button"
          variant="secondary"
          className={styles.actionButton}
          disabled={context.deletingId === transaction.id}
          onClick={() => context.onEditStart(transaction)}
        >
          Editar
        </Button>
        <ButtonLoading
          type="button"
          variant="danger"
          className={styles.actionButton}
          loading={context.deletingId === transaction.id}
          onClick={() => {
            void context.onDelete(transaction.id)
          }}
        >
          Apagar
        </ButtonLoading>
      </div>
    )
  }

  return (
    <div className={styles.actionsGroup}>
      <Button
        type="button"
        variant="secondary"
        className={styles.iconActionButton}
        disabled={context.deletingId === transaction.id}
        aria-label="Editar transacao"
        title="Editar transacao"
        onClick={() => context.onEditStart(transaction)}
      >
        <FiEdit2 />
      </Button>
      <ButtonLoading
        type="button"
        variant="danger"
        className={styles.iconActionButton}
        loading={context.deletingId === transaction.id}
        aria-label="Apagar transacao"
        title="Apagar transacao"
        onClick={() => {
          void context.onDelete(transaction.id)
        }}
      >
        <FiTrash2 />
      </ButtonLoading>
    </div>
  )
}
