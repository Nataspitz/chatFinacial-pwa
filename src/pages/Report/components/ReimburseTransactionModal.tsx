import { useEffect, useState } from 'react'
import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { RefundScope, Transaction } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface ReimburseTransactionModalProps {
  transaction: Transaction | null
  isSubmitting: boolean
  feedback: string
  onClose: () => void
  onConfirm: (options: {
    mode: 'refunded' | 'canceled'
    reason?: string
    scope?: RefundScope
  }) => void
}

export const ReimburseTransactionModal = ({
  transaction,
  isSubmitting,
  feedback,
  onClose,
  onConfirm
}: ReimburseTransactionModalProps): JSX.Element => {
  const [mode, setMode] = useState<'refunded' | 'canceled'>('refunded')
  const [scope, setScope] = useState<RefundScope>('single')
  const [reason, setReason] = useState('')
  const isInstallmentGroup = Boolean(transaction?.installmentGroupId && transaction.installmentCount > 1)

  useEffect(() => {
    if (!transaction) return
    setMode('refunded')
    setScope('single')
    setReason('')
  }, [transaction])

  return (
    <ModalBase open={transaction !== null} title="Anular ou reembolsar transação" onClose={onClose}>
      <form
        className={styles.createForm}
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm({
            mode,
            reason,
            scope: isInstallmentGroup ? scope : 'single'
          })
        }}
      >
        <div className={styles.confirmDeleteContent}>
          <p>Essa ação não cria uma entrada. Ela anula o impacto financeiro da transação original nos relatórios principais.</p>
        </div>

        <label className={styles.createField}>
          <span>Tipo</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as 'refunded' | 'canceled')}>
            <option value="refunded">Valor reembolsado/estornado</option>
            <option value="canceled">Compra cancelada/anulada</option>
          </select>
        </label>

        {isInstallmentGroup ? (
          <label className={styles.createField}>
            <span>Escopo</span>
            <select value={scope} onChange={(event) => setScope(event.target.value as RefundScope)}>
              <option value="single">Apenas esta parcela</option>
              <option value="future">Esta e próximas parcelas</option>
              <option value="group">Todas as parcelas do grupo</option>
            </select>
          </label>
        ) : null}

        <label className={styles.createField}>
          <span>Motivo</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Opcional"
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
