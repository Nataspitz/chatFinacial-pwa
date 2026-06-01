import { FormField } from '../../../components/molecules/FormField/FormField'
import { Button, ButtonLoading, Input, ModalBase } from '../../../components/ui'
import type { GoalAllocationType, GoalPlanningType } from '../../../types/goal.types'
import styles from '../Goals.module.css'

export interface GoalFormState {
  title: string
  targetAmount: string
  planningType: GoalPlanningType
  reservedAmount: string
  countsAsReserved: boolean
  allocationType: GoalAllocationType
  allocationValue: string
  linkedCategories: string
}

interface GoalFormModalProps {
  open: boolean
  isEditing: boolean
  isSaving: boolean
  form: GoalFormState
  maxReservableAmount: number
  onChange: (form: GoalFormState) => void
  onClose: () => void
  onSubmit: () => void
}

export const initialGoalFormState: GoalFormState = {
  title: '',
  targetAmount: '',
  planningType: 'goal',
  reservedAmount: '',
  countsAsReserved: true,
  allocationType: 'fixed',
  allocationValue: '',
  linkedCategories: ''
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const toFiniteNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const GoalFormModal = ({
  open,
  isEditing,
  isSaving,
  form,
  maxReservableAmount,
  onChange,
  onClose,
  onSubmit
}: GoalFormModalProps): JSX.Element => {
  const safeMaxReservableAmount = Math.max(0, maxReservableAmount)
  const reservedAmount = Math.min(Math.max(0, toFiniteNumber(form.reservedAmount)), safeMaxReservableAmount)
  const reserveStep = safeMaxReservableAmount > 10000 ? 50 : 10

  return (
    <ModalBase open={open} title={isEditing ? 'Editar planejamento' : 'Novo planejamento'} onClose={onClose}>
      <form
        className={styles.goalForm}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className={styles.formGrid}>
          <FormField label="Tipo">
            <select
              className={styles.formSelect}
              value={form.planningType}
              onChange={(event) => onChange({ ...form, planningType: event.target.value as GoalPlanningType })}
              disabled={isSaving}
            >
              <option value="goal">Meta</option>
              <option value="reserve">Reserva</option>
              <option value="bill_provision">Provisao de contas</option>
            </select>
          </FormField>

          <FormField label="Nome">
            <Input
              type="text"
              value={form.title}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              placeholder="Ex: Reserva de emergencia"
              disabled={isSaving}
            />
          </FormField>
        </div>

        <div className={styles.formGrid}>
          <FormField label="Valor alvo">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.targetAmount}
              onChange={(event) => onChange({ ...form, targetAmount: event.target.value })}
              placeholder="0.00"
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Valor reservado atual">
            <div className={styles.reservePicker}>
              <div className={styles.reservePickerHeader}>
                <strong>{formatCurrency(reservedAmount)}</strong>
                <span>Máximo: {formatCurrency(safeMaxReservableAmount)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={safeMaxReservableAmount}
                step={reserveStep}
                value={reservedAmount}
                onChange={(event) => onChange({ ...form, reservedAmount: event.target.value })}
                disabled={isSaving || safeMaxReservableAmount <= 0}
              />
              <div className={styles.reservePickerActions}>
                <button
                  type="button"
                  onClick={() => onChange({ ...form, reservedAmount: '0' })}
                  disabled={isSaving}
                >
                  Zerar
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...form, reservedAmount: String(safeMaxReservableAmount) })}
                  disabled={isSaving || safeMaxReservableAmount <= 0}
                >
                  Usar máximo
                </button>
              </div>
            </div>
          </FormField>
        </div>

        <div className={styles.formGrid}>
          <FormField label="Regra mensal">
            <select
              className={styles.formSelect}
              value={form.allocationType}
              onChange={(event) => onChange({ ...form, allocationType: event.target.value as GoalAllocationType })}
              disabled={isSaving}
            >
              <option value="fixed">Valor fixo</option>
              <option value="percentage">% do faturamento</option>
            </select>
          </FormField>

          <FormField label={form.allocationType === 'percentage' ? 'Percentual do faturamento' : 'Valor mensal'}>
            <Input
              type="number"
              min="0"
              max={form.allocationType === 'percentage' ? '100' : undefined}
              step="0.01"
              value={form.allocationValue}
              onChange={(event) => onChange({ ...form, allocationValue: event.target.value })}
              placeholder={form.allocationType === 'percentage' ? '0%' : '0.00'}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={form.countsAsReserved}
            onChange={(event) => onChange({ ...form, countsAsReserved: event.target.checked })}
            disabled={isSaving}
          />
          <span>Conta como dinheiro reservado</span>
        </label>

        <FormField label="Categorias vinculadas">
          <Input
            type="text"
            value={form.linkedCategories}
            onChange={(event) => onChange({ ...form, linkedCategories: event.target.value })}
            placeholder="Ex: Luz, Agua, Material, Manutencao"
            disabled={isSaving}
          />
        </FormField>

        <div className={styles.formActions}>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <ButtonLoading type="submit" loading={isSaving}>
            Salvar planejamento
          </ButtonLoading>
        </div>
      </form>
    </ModalBase>
  )
}
