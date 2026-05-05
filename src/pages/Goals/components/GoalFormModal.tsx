import { FormField } from '../../../components/molecules/FormField/FormField'
import { Button, ButtonLoading, Input, ModalBase } from '../../../components/ui'
import styles from '../Goals.module.css'

export interface GoalFormState {
  title: string
  targetAmount: string
}

interface GoalFormModalProps {
  open: boolean
  isEditing: boolean
  isSaving: boolean
  form: GoalFormState
  onChange: (form: GoalFormState) => void
  onClose: () => void
  onSubmit: () => void
}

export const initialGoalFormState: GoalFormState = {
  title: '',
  targetAmount: ''
}

export const GoalFormModal = ({
  open,
  isEditing,
  isSaving,
  form,
  onChange,
  onClose,
  onSubmit
}: GoalFormModalProps): JSX.Element => {
  return (
    <ModalBase open={open} title={isEditing ? 'Editar meta' : 'Nova meta'} onClose={onClose}>
      <form
        className={styles.goalForm}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <FormField label="Nome da meta">
          <Input
            type="text"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="Ex: Reserva de emergência"
            disabled={isSaving}
          />
        </FormField>

        <FormField label="Valor da meta">
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

        <div className={styles.formActions}>
          <Button type="button" variant="ghost" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <ButtonLoading type="submit" loading={isSaving}>
            Salvar meta
          </ButtonLoading>
        </div>
      </form>
    </ModalBase>
  )
}
