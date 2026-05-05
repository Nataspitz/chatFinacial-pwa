import type { HistoryMonthItem } from '../auditoria.utils'
import { formatMonthLabel } from '../auditoria.utils'
import styles from '../Auditoria.module.css'

interface AuditHistorySectionProps {
  historyByMonth: HistoryMonthItem[]
}

export const AuditHistorySection = ({ historyByMonth }: AuditHistorySectionProps): JSX.Element => (
  <section className={styles.section}>
    <header className={styles.sectionHeader}>
      <h2>Histórico de auditorias</h2>
      <span>{historyByMonth.length} meses</span>
    </header>

    {historyByMonth.length === 0 ? (
      <p className={styles.stateMessage}>Nenhuma auditoria registrada ainda.</p>
    ) : (
      <div className={styles.historyList}>
        {historyByMonth.map((item) => (
          <article key={item.monthRef} className={styles.historyItem}>
            <div className={styles.historyMain}>
              <strong>{formatMonthLabel(item.monthRef)}</strong>
              <p>{item.detail}</p>
            </div>
            <div className={styles.historySide}>
              <span className={`${styles.badge} ${styles[item.tone]}`.trim()}>{item.label}</span>
              {item.totalCount > 0 ? <small>{item.confirmedCount}/{item.totalCount}</small> : <small>--</small>}
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
)
