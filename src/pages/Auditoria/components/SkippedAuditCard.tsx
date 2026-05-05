import { FiSlash } from 'react-icons/fi'
import styles from '../Auditoria.module.css'

export const SkippedAuditCard = (): JSX.Element => (
  <article className={`${styles.auditCard} ${styles.skippedCard}`.trim()}>
    <div className={styles.cardTop}>
      <strong>Abril 2026</strong>
      <span className={`${styles.badge} ${styles.skipped}`.trim()}>Pulado</span>
    </div>
    <p className={styles.metaRow}>
      <FiSlash aria-hidden />
      <span>Mês de transição, sem obrigatoriedade de auditoria.</span>
    </p>
  </article>
)
