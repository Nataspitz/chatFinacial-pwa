import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface ConfirmTransactionModalProps {
  transaction: Transaction | null
  confirmingId: string | null
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmTransactionModal = ({
  transaction,
  confirmingId,
  onClose,
  onConfirm
}: ConfirmTransactionModalProps): JSX.Element => (
  <ModalBase open={transaction !== null} title="Validar transação" onClose={onClose}>
    <div className={styles.confirmDeleteContent}>
      <p>Deseja validar esta transação como confirmada?</p>

      <div className={styles.createActions}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={confirmingId !== null}>
          Cancelar
        </Button>
        <ButtonLoading type="button" variant="primary" loading={confirmingId !== null} onClick={onConfirm}>
          Confirmar validação
        </ButtonLoading>
      </div>
    </div>
  </ModalBase>
)
