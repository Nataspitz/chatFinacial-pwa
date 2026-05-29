import { FiAlertTriangle, FiInfo } from 'react-icons/fi'
import type { CashPlanningAlert } from '../services/cashPlanningPageData'
import styles from '../Goals.module.css'

interface CashPlanningAlertsProps {
  alerts: CashPlanningAlert[]
}

export const CashPlanningAlerts = ({ alerts }: CashPlanningAlertsProps): JSX.Element | null => {
  if (alerts.length === 0) {
    return null
  }

  return (
    <section className={styles.alertSection} aria-label="Atenções do planejamento">
      <header className={styles.sectionTitleBlock}>
        <h2>Atenções do planejamento</h2>
        <p>Pontos que podem deixar o caixa menos confiável.</p>
      </header>

      <div className={styles.alertGrid}>
        {alerts.map((alert) => (
          <article key={alert.message} className={`${styles.alertCard} ${styles[`alert${alert.type}`]}`}>
            {alert.type === 'info' ? <FiInfo aria-hidden /> : <FiAlertTriangle aria-hidden />}
            <span>{alert.message}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
