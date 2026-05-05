import { useState, type MouseEvent } from 'react'
import { FiChevronDown, FiChevronUp, FiMoreVertical } from 'react-icons/fi'
import { Button, ButtonLoading } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import {
  formatPaymentMethod,
  getCategorySelectOptions,
  getConfirmedValue,
  getMonthlyCostValue
} from './transactionTable.utils'
import type { EditField, OpenTransactionContextMenu, TransactionActionContext } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionMobileItemProps {
  actionContext: TransactionActionContext
  categoryOptions: string[]
  editingDraft: Transaction | null
  editingId: string | null
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  onEditChange: (field: EditField, value: string | boolean) => void
  onOpenContextMenu: OpenTransactionContextMenu
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
  onOpenContextMenu,
  transaction
}: TransactionMobileItemProps): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isEditing = editingId === transaction.id && editingDraft !== null

  const handleOpenMenu = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    const buttonRect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX || buttonRect.left + buttonRect.width / 2
    const y = event.clientY || buttonRect.top + buttonRect.height / 2

    onOpenContextMenu(transaction, {
      x,
      y
    })
  }

  return (
    <article className={styles.mobileItem} data-transaction-id={transaction.id}>
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
            <span className={styles.mobileLabel}>Descrição</span>
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
                <option value="debito">Débito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
          </div>
          <div className={styles.mobileRow}>
            <span className={styles.mobileLabel}>Parcela</span>
            <div className={styles.mobileValue}>
              {editingDraft.paymentMethod === 'credito' ? (
                <input
                  type="number"
                  min="1"
                  max="48"
                  step="1"
                  className={styles.cellInput}
                  value={String(Math.max(1, editingDraft.installmentCount))}
                  onChange={(event) => onEditChange('installmentCount', event.target.value)}
                />
              ) : (
                '-'
              )}
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
          <div className={`${styles.mobileActions} ${styles.mobileEditActions}`.trim()}>
            <ButtonLoading
              type="button"
              variant="primary"
              className={styles.actionButton}
              loading={actionContext.isSavingEdit}
              onClick={() => {
                void actionContext.onEditSave()
              }}
            >
              Salvar
            </ButtonLoading>
            <Button
              type="button"
              variant="secondary"
              className={styles.actionButton}
              disabled={actionContext.isSavingEdit}
              onClick={actionContext.onEditCancel}
            >
              Cancelar
            </Button>
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
                 <span className={styles.mobileLabel}>Descrição</span>
                <div className={styles.mobileValue}>{transaction.description}</div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Pagamento</span>
                <div className={styles.mobileValue}>{formatPaymentMethod(transaction.paymentMethod)}</div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Parcela</span>
                <div className={styles.mobileValue}>
                  {transaction.paymentMethod === 'credito'
                    ? `${Math.max(1, transaction.installmentNumber)}/${Math.max(1, transaction.installmentCount)}`
                    : '-'}
                </div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Confirmado</span>
                <div className={styles.mobileValue}>{transaction.isConfirmed ? 'Sim' : 'Não'}</div>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Custo mensal</span>
                <div className={`${styles.mobileValue} ${styles.mobileRowActions}`.trim()}>
                  <span>{transaction.type === 'saida' ? (transaction.isMonthlyCost ? 'Sim' : 'Não') : '-'}</span>
                  <button
                    type="button"
                    className={styles.rowMenuButton}
                    aria-label="Abrir menu da transação"
                    onClick={handleOpenMenu}
                  >
                    <FiMoreVertical />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </article>
  )
}
