import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { Transaction } from '../../../types/transaction.types'
import styles from '../Settings.module.css'

interface TrashModalProps {
  open: boolean
  deletedTransactions: Transaction[]
  selectedDeletedIds: string[]
  isLoadingTrash: boolean
  isRestoringTrash: boolean
  isClearingTrash: boolean
  feedback: string
  onClose: () => void
  onToggleDeleted: (id: string) => void
  onToggleAllDeleted: () => void
  onRestoreDeleted: () => void
  onPurgeDeleted: () => void
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const TrashModal = ({
  open,
  deletedTransactions,
  selectedDeletedIds,
  isLoadingTrash,
  isRestoringTrash,
  isClearingTrash,
  feedback,
  onClose,
  onToggleDeleted,
  onToggleAllDeleted,
  onRestoreDeleted,
  onPurgeDeleted
}: TrashModalProps): JSX.Element => (
  <ModalBase
    open={open}
    title="Lixeira de transações"
    onClose={() => {
      if (isLoadingTrash || isRestoringTrash || isClearingTrash) return
      onClose()
    }}
  >
    <div className={styles.trashModalContent}>
      {isLoadingTrash ? (
        <p className={styles.trashStateCenter}>Carregando itens apagados...</p>
      ) : deletedTransactions.length === 0 ? (
        <p className={styles.trashStateCenter}>Nenhum item apagado.</p>
      ) : (
        <>
          <label className={styles.checkField}>
            <input
              type="checkbox"
              checked={selectedDeletedIds.length > 0 && selectedDeletedIds.length === deletedTransactions.length}
              onChange={onToggleAllDeleted}
              disabled={isRestoringTrash || isClearingTrash}
            />
            <span>Selecionar todos</span>
          </label>

          <div className={styles.trashList}>
            {deletedTransactions.map((item) => (
              <label key={item.id} className={styles.trashRow}>
                <input
                  type="checkbox"
                  checked={selectedDeletedIds.includes(item.id)}
                  onChange={() => onToggleDeleted(item.id)}
                  disabled={isRestoringTrash || isClearingTrash}
                />
                <div className={styles.trashRowBody}>
                  <strong>{item.category}</strong>
                  <span>{item.description}</span>
                </div>
                <strong>{formatCurrency(item.amount)}</strong>
              </label>
            ))}
          </div>
        </>
      )}

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

      <div className={styles.actionsRow}>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isRestoringTrash || isClearingTrash}>
          Fechar
        </Button>
        <ButtonLoading
          type="button"
          variant="secondary"
          loading={isRestoringTrash}
          disabled={isClearingTrash || deletedTransactions.length === 0}
          onClick={onRestoreDeleted}
        >
          {selectedDeletedIds.length > 0 ? 'Recuperar selecionados' : 'Recuperar tudo'}
        </ButtonLoading>
        <ButtonLoading
          type="button"
          variant="danger"
          loading={isClearingTrash}
          disabled={isRestoringTrash || deletedTransactions.length === 0}
          onClick={onPurgeDeleted}
        >
          Limpar lixeira
        </ButtonLoading>
      </div>
    </div>
  </ModalBase>
)
