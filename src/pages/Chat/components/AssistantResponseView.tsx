import type { AssistantResponse } from '../../../features/chat/assistant'
import styles from '../Chat.module.css'

interface AssistantResponseViewProps {
  response: AssistantResponse
  disabled?: boolean
  onSendMessage: (message: string, displayMessage?: string) => void
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

const getValueClassName = (value: number): string => (value >= 0 ? styles.positiveValue : styles.negativeValue)

export const AssistantResponseView = ({ response, disabled = false, onSendMessage }: AssistantResponseViewProps) => {
  if (response.type === 'transactions_list') {
    return (
      <div className={styles.responseBlock}>
        <p className={styles.body}>{response.message}</p>
        <div className={styles.compactList}>
          {response.data.slice(0, 8).map((transaction) => (
            <div key={transaction.id} className={styles.transactionItem}>
              <div>
                <strong>{transaction.description}</strong>
                <span>
                  {formatDate(transaction.date)} · {transaction.category}
                </span>
              </div>
              <strong className={transaction.type === 'entrada' ? styles.positiveValue : styles.negativeValue}>
                {currency.format(transaction.amount)}
              </strong>
            </div>
          ))}
        </div>
        {response.data.length > 8 ? <span className={styles.hintText}>Mostrando 8 de {response.data.length} transações.</span> : null}
      </div>
    )
  }

  if (response.type === 'transaction_draft') {
    return (
      <div className={styles.responseBlock}>
        <p className={styles.body}>{response.message}</p>
        <div className={styles.draftCard}>
          <div>
            <span>Tipo</span>
            <strong>{response.draft.type === 'income' ? 'Entrada' : 'Despesa'}</strong>
          </div>
          <div>
            <span>Valor</span>
            <strong>{currency.format(response.draft.amount)}</strong>
          </div>
          <div>
            <span>Descrição</span>
            <strong>{response.draft.description}</strong>
          </div>
          <div>
            <span>Data</span>
            <strong>{formatDate(response.draft.date)}</strong>
          </div>
          {response.draft.categoryHint ? (
            <div>
              <span>Categoria</span>
              <strong>{response.draft.categoryHint}</strong>
            </div>
          ) : null}
        </div>
        <div className={styles.messageActions}>
          <button
            type="button"
            className={styles.actionButton}
            disabled={disabled}
            onClick={() => onSendMessage('confirmar', 'Confirmar')}
          >
            Confirmar
          </button>
          <button
            type="button"
            className={styles.actionButtonSecondary}
            disabled={disabled}
            onClick={() => onSendMessage('cancelar', 'Cancelar')}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (response.type === 'summary') {
    return (
      <div className={styles.responseBlock}>
        <p className={styles.body}>{response.message}</p>
        <div className={styles.metricGrid}>
          <Metric label="Entradas" value={response.data.incomeTotal} />
          <Metric label="Despesas" value={-response.data.expenseTotal} />
          <Metric label="Saldo" value={response.data.balance} />
          <div className={styles.metricCard}>
            <span>Transações</span>
            <strong>{response.data.transactionCount}</strong>
          </div>
        </div>
      </div>
    )
  }

  if (response.type === 'balance') {
    return (
      <div className={styles.responseBlock}>
        <p className={styles.body}>{response.message}</p>
        <div className={styles.metricGrid}>
          <Metric label="Entradas" value={response.data.incomeTotal} />
          <Metric label="Despesas" value={-response.data.expenseTotal} />
          <Metric label="Saldo" value={response.data.balance} />
        </div>
      </div>
    )
  }

  return <p className={styles.body}>{response.message}</p>
}

interface MetricProps {
  label: string
  value: number
}

const Metric = ({ label, value }: MetricProps) => (
  <div className={styles.metricCard}>
    <span>{label}</span>
    <strong className={getValueClassName(value)}>{currency.format(value)}</strong>
  </div>
)
