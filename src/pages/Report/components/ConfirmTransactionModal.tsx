import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { CashPlanningOption } from '../../../services/cash-planning-movements.service'
import type { Transaction } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface ConfirmTransactionModalProps {
  transaction: Transaction | null
  confirmingId: string | null
  cashPlanningOptions: CashPlanningOption[]
  selectedCashPlanningGoalId: string
  onSelectedCashPlanningGoalIdChange: (goalId: string) => void
  onClose: () => void
  onConfirm: () => void
}

export const ConfirmTransactionModal = ({
  transaction,
  confirmingId,
  cashPlanningOptions,
  selectedCashPlanningGoalId,
  onSelectedCashPlanningGoalIdChange,
  onClose,
  onConfirm
}: ConfirmTransactionModalProps): JSX.Element => (
  <ModalBase open={transaction !== null} title="Validar transação" onClose={onClose}>
    <div className={styles.confirmDeleteContent}>
      <p>Deseja validar esta transação como confirmada?</p>

      {transaction ? (
        <label className={styles.createField}>
          <span>{transaction.type === 'saida' ? 'Pagar usando repartição' : 'Enviar para repartição'}</span>
          <select
            value={selectedCashPlanningGoalId}
            onChange={(event) => onSelectedCashPlanningGoalIdChange(event.target.value)}
            disabled={confirmingId !== null}
          >
            <option value="">Nenhuma repartição</option>
            {cashPlanningOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

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
