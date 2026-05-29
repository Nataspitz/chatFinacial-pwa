import type { Dispatch, SetStateAction } from 'react'
import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import { getDefaultPaymentMethodByType, type TransactionSettings } from '../../../types/transaction-settings.types'
import type { PaymentMethod, Transaction } from '../../../types/transaction.types'
import { getDefaultTransactionCategory } from '../../../utils/transaction-categories'
import type { CreateFormState } from './report-page.types'
import styles from '../Report.module.css'

interface CreateTransactionModalProps {
  open: boolean
  form: CreateFormState
  transactionSettings: TransactionSettings
  feedback: string
  isCreating: boolean
  auditLockCutoffDate: string
  setForm: Dispatch<SetStateAction<CreateFormState>>
  onClose: () => void
  onSubmit: () => void
}

export const CreateTransactionModal = ({
  open,
  form,
  transactionSettings,
  feedback,
  isCreating,
  auditLockCutoffDate,
  setForm,
  onClose,
  onSubmit
}: CreateTransactionModalProps): JSX.Element => (
  <ModalBase open={open} title="Nova transação" onClose={onClose}>
    <form
      className={styles.createForm}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className={`${styles.createField} ${styles.createFieldType}`}>
        <span>Tipo</span>
        <select
          value={form.type}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              type: event.target.value as Transaction['type'],
              category: getDefaultTransactionCategory(),
              isMonthlyCost: event.target.value === 'saida' ? transactionSettings.defaultMonthlyCostSaida : false,
              paymentMethod: getDefaultPaymentMethodByType(transactionSettings, event.target.value as Transaction['type']),
              installmentCount: 1
            }))
          }
        >
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>

      {form.type === 'saida' ? (
        <label className={`${styles.createCheck} ${styles.createFieldFull}`}>
          <input
            type="checkbox"
            checked={form.isMonthlyCost}
            onChange={(event) => setForm((prev) => ({ ...prev, isMonthlyCost: event.target.checked }))}
          />
          <span>Marcar como custo mensal</span>
        </label>
      ) : null}

      <label className={styles.createField}>
        <span>Valor</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          placeholder="0.00"
        />
      </label>

      <label className={styles.createField}>
        <span>Data</span>
        <input
          type="date"
          min={auditLockCutoffDate}
          value={form.date}
          onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
        />
      </label>

      <label className={styles.createField}>
        <span>Categoria</span>
        <input type="text" value={form.category || getDefaultTransactionCategory()} readOnly />
      </label>

      <label className={styles.createField}>
        <span>Forma de pagamento</span>
        <select
          value={form.paymentMethod}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              paymentMethod: event.target.value as PaymentMethod,
              installmentCount: event.target.value === 'credito' ? prev.installmentCount : 1
            }))
          }
        >
          <option value="pix">Pix</option>
          <option value="debito">Débito</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="credito">Crédito</option>
        </select>
      </label>

      {form.paymentMethod === 'credito' ? (
        <label className={styles.createField}>
          <span>Parcelas</span>
          <input
            type="number"
            min="1"
            max="48"
            step="1"
            value={String(form.installmentCount)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                installmentCount: Math.max(1, Math.min(48, Number(event.target.value) || 1))
              }))
            }
          />
        </label>
      ) : null}

      <label className={`${styles.createField} ${styles.createFieldFull}`}>
        <span>Descrição</span>
        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={3}
          placeholder="Descreva a transação"
        />
      </label>

      {feedback ? <p className={styles.createFeedback}>{feedback}</p> : null}

      <div className={styles.createActions}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isCreating}>
          Cancelar
        </Button>
        <ButtonLoading type="submit" loading={isCreating}>
          Salvar transação
        </ButtonLoading>
      </div>
    </form>
  </ModalBase>
)
