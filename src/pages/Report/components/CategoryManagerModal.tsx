import { Button, ButtonLoading, ModalBase } from '../../../components/ui'
import type { CategoryItem } from '../../../services/finance.service'
import type { TransactionType } from '../../../types/transaction.types'
import styles from '../Report.module.css'

interface CategoryManagerModalProps {
  open: boolean
  categoryType: TransactionType
  categoryOptions: Record<TransactionType, CategoryItem[]>
  isCreateOpen: boolean
  newCategoryName: string
  editingCategoryId: string | null
  editingCategoryName: string
  feedback: string
  isSaving: boolean
  updatingId: string | null
  deletingId: string | null
  onClose: () => void
  onTypeChange: (type: TransactionType) => void
  onToggleCreate: () => void
  onNewCategoryNameChange: (value: string) => void
  onCreateCategory: () => void
  onStartEdit: (item: CategoryItem) => void
  onCancelEdit: () => void
  onEditingNameChange: (value: string) => void
  onUpdateCategory: (categoryId: string) => void
  onDeleteCategory: (categoryId: string) => void
}

export const CategoryManagerModal = ({
  open,
  categoryType,
  categoryOptions,
  isCreateOpen,
  newCategoryName,
  editingCategoryId,
  editingCategoryName,
  feedback,
  isSaving,
  updatingId,
  deletingId,
  onClose,
  onTypeChange,
  onToggleCreate,
  onNewCategoryNameChange,
  onCreateCategory,
  onStartEdit,
  onCancelEdit,
  onEditingNameChange,
  onUpdateCategory,
  onDeleteCategory
}: CategoryManagerModalProps): JSX.Element => (
  <ModalBase open={open} title="Gerenciar categorias" onClose={onClose}>
    <div className={styles.categoryManager}>
      <div className={styles.categoryTopBar}>
        <label className={styles.createField}>
          <span>Tipo</span>
          <select value={categoryType} onChange={(event) => onTypeChange(event.target.value as TransactionType)}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <Button type="button" variant="secondary" onClick={onToggleCreate}>
          {isCreateOpen ? 'Cancelar nova categoria' : 'Criar nova categoria'}
        </Button>
      </div>

      {isCreateOpen ? (
        <label className={styles.createField}>
          <span>Nova categoria</span>
          <div className={styles.categoryInline}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(event) => onNewCategoryNameChange(event.target.value)}
              placeholder="Ex: Alimentação"
            />
            <ButtonLoading type="button" loading={isSaving} onClick={onCreateCategory}>
              Adicionar
            </ButtonLoading>
          </div>
        </label>
      ) : null}

      <div className={styles.categoryList}>
        {categoryOptions[categoryType].length === 0 ? (
          <p className={styles.empty}>Nenhuma categoria cadastrada para este tipo.</p>
        ) : (
          categoryOptions[categoryType].map((item) => (
            <article key={item.id} className={styles.categoryItem}>
              <div className={styles.categoryItemInfo}>
                {editingCategoryId === item.id ? (
                  <input
                    type="text"
                    className={styles.cellInput}
                    value={editingCategoryName}
                    onChange={(event) => onEditingNameChange(event.target.value)}
                  />
                ) : (
                  <strong className={styles.categoryName}>{item.name}</strong>
                )}
              </div>

              <div className={styles.categoryActions}>
                {editingCategoryId === item.id ? (
                  <>
                    <ButtonLoading
                      type="button"
                      loading={updatingId === item.id}
                      disabled={!editingCategoryName.trim() || deletingId === item.id}
                      onClick={() => onUpdateCategory(item.id)}
                    >
                      Salvar
                    </ButtonLoading>
                    <Button type="button" variant="ghost" disabled={updatingId === item.id} onClick={onCancelEdit}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" disabled={deletingId === item.id} onClick={() => onStartEdit(item)}>
                      Editar
                    </Button>
                    <ButtonLoading
                      type="button"
                      variant="danger"
                      loading={deletingId === item.id}
                      disabled={updatingId === item.id}
                      onClick={() => onDeleteCategory(item.id)}
                    >
                      Apagar
                    </ButtonLoading>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {feedback ? <p className={styles.createFeedback}>{feedback}</p> : null}
    </div>
  </ModalBase>
)
