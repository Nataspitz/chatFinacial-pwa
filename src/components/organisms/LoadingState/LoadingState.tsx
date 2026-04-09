import styles from './LoadingState.module.css'

interface LoadingStateProps {
  label?: string
  centered?: boolean
}

export const LoadingState = ({ label = 'Carregando...', centered = false }: LoadingStateProps): JSX.Element => {
  const content = (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.visual} aria-hidden="true">
        <span className={styles.orb} />
        <span className={styles.ring} />
        <div className={styles.bars}>
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  )

  if (centered) {
    return <div className={styles.centered}>{content}</div>
  }

  return content
}
