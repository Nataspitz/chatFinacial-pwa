import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { CashPlanningOption } from '../../../services/cash-planning-movements.service'
import type { Transaction } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface TransactionAllocationModalProps {
  transaction: Transaction | null
  cashPlanningOptions: CashPlanningOption[]
  selectedCashPlanningGoalId: string
  feedback: string
  isLoading: boolean
  isSaving: boolean
  onSelectedCashPlanningGoalIdChange: (goalId: string) => void
  onClose: () => void
  onSubmit: () => void
}

const getTitle = (selectedCashPlanningGoalId: string): string =>
  selectedCashPlanningGoalId ? 'Editar repartição da transação' : 'Adicionar à repartição'

export const TransactionAllocationModal = ({
  transaction,
  cashPlanningOptions,
  selectedCashPlanningGoalId,
  feedback,
  isLoading,
  isSaving,
  onSelectedCashPlanningGoalIdChange,
  onClose,
  onSubmit
}: TransactionAllocationModalProps): JSX.Element => (
  <ModalBase open={transaction !== null} title={getTitle(selectedCashPlanningGoalId)} onClose={onClose}>
    <div className={styles.confirmDeleteContent}>
      <p>
        Escolha a repartição que deve receber ou pagar esta transação. Entradas aumentam o reservado; saídas reduzem o reservado.
      </p>

      <label className={styles.createField}>
        <span>{transaction?.type === 'saida' ? 'Pagar usando repartição' : 'Enviar para repartição'}</span>
        <select
          value={selectedCashPlanningGoalId}
          onChange={(event) => onSelectedCashPlanningGoalIdChange(event.target.value)}
          disabled={isLoading || isSaving || !transaction?.isConfirmed}
        >
          <option value="">Nenhuma repartição</option>
          {cashPlanningOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </label>

      {!transaction?.isConfirmed ? (
        <p className={styles.createFeedback}>Confirme a transação antes de vincular a uma repartição.</p>
      ) : null}
      {feedback ? <p className={styles.createFeedback}>{feedback}</p> : null}

      <div className={styles.createActions}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <ButtonLoading
          type="button"
          variant="primary"
          loading={isSaving || isLoading}
          onClick={onSubmit}
          disabled={!transaction?.isConfirmed || isLoading}
        >
          Salvar repartição
        </ButtonLoading>
      </div>
    </div>
  </ModalBase>
)
