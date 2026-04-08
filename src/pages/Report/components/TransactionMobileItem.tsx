import { useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import type { Transaction } from '../../../types/transaction.types'
import { TransactionActions } from './TransactionActions'
import {
  formatPaymentMethod,
  getCategorySelectOptions,
  getConfirmedValue,
  getMonthlyCostValue
} from './transactionTable.utils'
import type { EditField, TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionMobileItemProps {
  actionContext: TransactionActionContext
  categoryOptions: string[]
  editingDraft: Transaction | null
  editingId: string | null
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onEditChange: (field: EditField, value: string | boolean) => void
  transaction: Transaction
}

export const TransactionMobileItem = ({
  actionContext,
  categoryOptions,
  editingDraft,
  editingId,
  formatCurrency,
  formatDate,
  onEditChange,
  transaction
}: TransactionMobileItemProps): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isEditing = editingId === transaction.id && editingDraft !== null

  return (
    <article className={styles.mobileItem}>
      {isEditing ? (
        <>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Data</span>
            <div className={styles.mobileValue}>
              <input
                type="date"
                className={styles.cellInput}
                value={editingDraft.date}
                onChange={(event) => onEditChange('date', event.target.value)}
              />
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Nome</span>
            <div className={styles.mobileValue}>
              <select
                className={styles.cellInput}
                value={editingDraft.category}
                onChange={(event) => onEditChange('category', event.target.value)}
              >
                {getCategorySelectOptions(categoryOptions, editingDraft.category).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Descricao</span>
            <div className={styles.mobileValue}>
              <input
                type="text"
                className={styles.cellInput}
                value={editingDraft.description}
                onChange={(event) => onEditChange('description', event.target.value)}
              />
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Valor</span>
            <div className={styles.mobileValue}>
              <input
                type="number"
                step="0.01"
                min="0"
                className={styles.cellInput}
                value={String(editingDraft.amount)}
                onChange={(event) => onEditChange('amount', event.target.value)}
              />
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Pagamento</span>
            <div className={styles.mobileValue}>
              <select
                className={styles.cellInput}
                value={editingDraft.paymentMethod}
                onChange={(event) => onEditChange('paymentMethod', event.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="debito">Debito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Credito</option>
              </select>
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Parcela</span>
            <div className={styles.mobileValue}>
              {transaction.installmentCount > 1
                ? `${transaction.installmentNumber}/${transaction.installmentCount}`
                : '-'}
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Confirmado</span>
            <div className={styles.mobileValue}>
              {getConfirmedValue(editingDraft, isEditing, onEditChange, transaction)}
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Custo mensal</span>
            <div className={styles.mobileValue}>
              {getMonthlyCostValue(editingDraft, isEditing, onEditChange, transaction)}
            </div>
          </div>
          <div className={styles.mobileActions}>
            <TransactionActions context={actionContext} isEditing={isEditing} mobile transaction={transaction} />
          </div>
        </>
      ) : (
        <>
          <div className={styles.mobileSummaryRow}>
            <div className={styles.mobileSummaryItem}>
              <span className={styles.mobileLabel}>Data</span>
              <div className={styles.mobileValue}>{formatDate(transaction.date)}</div>
            </div>
            <div className={styles.mobileSummaryItem}>
              <span className={styles.mobileLabel}>Nome</span>
              <div className={styles.mobileValue}>{transaction.category}</div>
            </div>
            <div className={styles.mobileSummaryItem}>
              <span className={styles.mobileLabel}>Valor</span>
              <div className={styles.mobileValue}>{formatCurrency(transaction.amount)}</div>
            </div>
          </div>

          <button
            type="button"
            className={styles.mobileReadMoreButton}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span>{isExpanded ? 'Ler menos' : 'Ler mais'}</span>
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          <div
            className={`${styles.mobileExpandedDetails} ${isExpanded ? styles.mobileExpandedDetailsOpen : ''}`.trim()}
            aria-hidden={!isExpanded}
          >
            <div className={styles.mobileExpandedDetailsInner}>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Descricao</span>
                <div className={styles.mobileValue}>{transaction.description}</div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Pagamento</span>
                <div className={styles.mobileValue}>{formatPaymentMethod(transaction.paymentMethod)}</div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Parcela</span>
                <div className={styles.mobileValue}>
                  {transaction.installmentCount > 1
                    ? `${transaction.installmentNumber}/${transaction.installmentCount}`
                    : '-'}
                </div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Confirmado</span>
                <div className={styles.mobileValue}>{transaction.isConfirmed ? 'Sim' : 'Nao'}</div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Custo mensal</span>
                <div className={styles.mobileValue}>
                  {transaction.type === 'saida' ? (transaction.isMonthlyCost ? 'Sim' : 'Nao') : '-'}
                </div>
              </div>
              <div className={styles.mobileActions}>
                <TransactionActions context={actionContext} isEditing={false} mobile transaction={transaction} />
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  )
}
