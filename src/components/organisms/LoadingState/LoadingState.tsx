import { Spinner } from '../../ui/Spinner/Spinner'
import styles from './LoadingState.module.css'

interface LoadingStateProps {
  label?: string
  centered?: boolean
}

export const LoadingState = ({ label = 'Carregando...', centered = false }: LoadingStateProps): JSX.Element => {
  const content = (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <Spinner size="md" />
      <span>{label}</span>
    </div>
  )

  if (centered) {
    return <div className={styles.centered}>{content}</div>
  }

  return content
}
