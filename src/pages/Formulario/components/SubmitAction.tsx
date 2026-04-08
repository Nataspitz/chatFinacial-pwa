import { ButtonLoading } from '../../../components/ui'
import styles from '../Formulario.module.css'

interface SubmitActionProps {
  isSubmitting: boolean
}

export const SubmitAction = ({ isSubmitting }: SubmitActionProps): JSX.Element => {
  return (
    <ButtonLoading variant="primary" className={styles.submitButton} type="submit" loading={isSubmitting}>
      Salvar transacao
    </ButtonLoading>
  )
}
