import { FiChevronDown } from 'react-icons/fi'
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
          <details key={item.monthRef} className={styles.historyItem}>
            <summary className={styles.historySummary}>
              <div className={styles.historyMain}>
                <strong>{formatMonthLabel(item.monthRef)}</strong>
                <p>{item.detail}</p>
              </div>
              <div className={styles.historySide}>
                <span className={`${styles.badge} ${styles[item.tone]}`.trim()}>{item.label}</span>
                {item.totalCount > 0 ? <small>{item.confirmedCount}/{item.totalCount}</small> : <small>--</small>}
                <FiChevronDown className={styles.historyChevron} aria-hidden />
              </div>
            </summary>

            <div className={styles.historySlices}>
              {item.slices.map((slice) => (
                <div key={slice.key} className={styles.historySliceItem}>
                  <div>
                    <strong>Fatia {slice.auditSlice}</strong>
                    <p>{slice.periodLabel}</p>
                    <small>{slice.certificateLabel}</small>
                  </div>
                  <span className={`${styles.badge} ${styles[slice.tone]}`.trim()}>{slice.statusLabel}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    )}
  </section>
)
