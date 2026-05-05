import { FiCalendar, FiClock } from 'react-icons/fi'
import type { AuditSliceCardItem } from '../auditoria.utils'
import styles from '../Auditoria.module.css'

interface AuditCardProps {
  item: AuditSliceCardItem
}

export const AuditCard = ({ item }: AuditCardProps): JSX.Element => (
  <article className={styles.auditCard}>
    <div className={styles.cardTop}>
      <strong>{item.sliceLabel}</strong>
      <span className={`${styles.badge} ${styles[item.tone]}`.trim()}>{item.statusLabel}</span>
    </div>
    <p className={styles.metaRow}>
      <FiCalendar aria-hidden />
      <span>{item.periodLabel}</span>
    </p>
    <p className={styles.metaRow}>
      <FiClock aria-hidden />
      <span>Liberação: {item.unlockLabel}</span>
    </p>
  </article>
)
