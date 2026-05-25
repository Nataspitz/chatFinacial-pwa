import type { Dispatch, SetStateAction } from 'react'
import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface ReimbursementFormState {
  reimbursedAt: string
  reimbursementResponsible: string
  reimbursementNotes: string
}

interface ReimburseTransactionModalProps {
  transaction: Transaction | null
  form: ReimbursementFormState
  isSubmitting: boolean
  feedback: string
  setForm: Dispatch<SetStateAction<ReimbursementFormState>>
  onClose: () => void
  onConfirm: () => void
}

export const ReimburseTransactionModal = ({
  transaction,
  form,
  isSubmitting,
  feedback,
  setForm,
  onClose,
  onConfirm
}: ReimburseTransactionModalProps): JSX.Element => {
  const isInstallmentGroup = Boolean(transaction?.installmentGroupId && transaction.installmentCount > 1)

  return (
    <ModalBase open={transaction !== null} title="Anular saída por reembolso" onClose={onClose}>
      <form
        className={styles.createForm}
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm()
        }}
      >
        <div className={styles.confirmDeleteContent}>
          <p>Essa ação não cria uma entrada. Ela apenas remove esta saída dos cálculos financeiros principais. A transação continuará salva no histórico interno.</p>
          {isInstallmentGroup ? (
            <p>Esta saída faz parte de uma compra parcelada. Todas as parcelas vinculadas serão marcadas como reembolsadas.</p>
          ) : null}
        </div>

        <label className={styles.createField}>
          <span>Data do reembolso</span>
          <input
            type="date"
            value={form.reimbursedAt}
            onChange={(event) => setForm((prev) => ({ ...prev, reimbursedAt: event.target.value }))}
            required
          />
        </label>

        <label className={styles.createField}>
          <span>Responsável</span>
          <input
            type="text"
            value={form.reimbursementResponsible}
            onChange={(event) => setForm((prev) => ({ ...prev, reimbursementResponsible: event.target.value }))}
            required
          />
        </label>

        <label className={styles.createField}>
          <span>Observação/motivo</span>
          <textarea
            value={form.reimbursementNotes}
            onChange={(event) => setForm((prev) => ({ ...prev, reimbursementNotes: event.target.value }))}
            required
          />
        </label>

        {feedback ? <p className={styles.createFeedback}>{feedback}</p> : null}

        <div className={styles.createActions}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <ButtonLoading type="submit" variant="primary" loading={isSubmitting}>
            Confirmar anulação
          </ButtonLoading>
        </div>
      </form>
    </ModalBase>
  )
}

export type { ReimbursementFormState }
