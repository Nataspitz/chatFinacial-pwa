import { useMemo, useState } from 'react'
import type { AssistantResponse } from '../../../features/chat/assistant'
import styles from '../Chat.module.css'

interface AssistantResponseViewProps {
  response: AssistantResponse
  disabled?: boolean
  onSendMessage: (message: string, displayMessage?: string) => void
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const PAGE_SIZE = 8

const formatDate = (value: string): string => {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

const getValueClassName = (value: number): string =>
  value >= 0 ? styles.positiveValue : styles.negativeValue

export const AssistantResponseView = ({
  response,
  disabled = false,
  onSendMessage
}: AssistantResponseViewProps) => {
  if (response.type === 'transactions_list') {
    return (
      <TransactionsListResponse response={response} disabled={disabled} />
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

  return (
    <div className={styles.responseBlock}>
      <p className={styles.body}>{response.message}</p>
      {response.quickActions?.length ? (
        <div className={styles.messageActions}>
          {response.quickActions.slice(0, 4).map((action) => (
            <button
              key={`${action.label}-${action.value}`}
              type="button"
              className={styles.actionButtonSecondary}
              disabled={disabled}
              onClick={() => onSendMessage(action.value, action.label)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface TransactionsListResponseProps {
  response: Extract<AssistantResponse, { type: 'transactions_list' }>
  disabled: boolean
}

const TransactionsListResponse = ({ response, disabled }: TransactionsListResponseProps) => {
  const [page, setPage] = useState(1)
  const total = response.data.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const currentItems = response.data.slice(start, start + PAGE_SIZE)

  const grouped = useMemo(
    () => ({
      entries: currentItems.filter((item) => item.type === 'entrada'),
      outcomes: currentItems.filter((item) => item.type === 'saida')
    }),
    [currentItems]
  )

  const renderGroup = (
    title: string,
    items: typeof currentItems,
    amountClassName: string
  ) => {
    if (items.length === 0) return null
    return (
      <div className={styles.compactList}>
        <span className={styles.hintText}>{title}</span>
        {items.map((transaction) => (
          <div key={transaction.id} className={styles.transactionItem}>
            <div>
              <strong>{transaction.description}</strong>
              <span>
                {formatDate(transaction.date)} · {transaction.category}
              </span>
            </div>
            <strong className={amountClassName}>{currency.format(transaction.amount)}</strong>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.responseBlock}>
      <p className={styles.body}>{response.message}</p>

      {renderGroup('Entradas', grouped.entries, styles.positiveValue)}
      {renderGroup('Saídas', grouped.outcomes, styles.negativeValue)}

      {totalPages > 1 ? (
        <div className={styles.messageActions}>
          <button
            type="button"
            className={styles.actionButtonSecondary}
            disabled={disabled || safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Página anterior
          </button>
          <span className={styles.hintText}>
            Página {safePage} de {totalPages}
          </span>
          <button
            type="button"
            className={styles.actionButtonSecondary}
            disabled={disabled || safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Próxima página
          </button>
        </div>
      ) : null}
    </div>
  )
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
