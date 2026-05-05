import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface DeleteTransactionModalProps {
  transaction: Transaction | null
  deletingId: string | null
  onClose: () => void
  onConfirm: () => void
}

export const DeleteTransactionModal = ({
  transaction,
  deletingId,
  onClose,
  onConfirm
}: DeleteTransactionModalProps): JSX.Element => (
  <ModalBase open={transaction !== null} title="Mover para lixeira" onClose={onClose}>
    <div className={styles.confirmDeleteContent}>
      <p>Deseja mover esta transação para a lixeira?</p>
      {transaction?.installmentCount && transaction.installmentCount > 1 ? (
        <p className={styles.confirmDeleteWarning}>
          Esta transação faz parte de um parcelamento. Ao confirmar, todas as parcelas desse grupo vão para a lixeira.
        </p>
      ) : null}

      <div className={styles.createActions}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={deletingId !== null}>
          Cancelar
        </Button>
        <ButtonLoading type="button" variant="danger" loading={deletingId !== null} onClick={onConfirm}>
          Confirmar exclusão
        </ButtonLoading>
      </div>
    </div>
  </ModalBase>
)
