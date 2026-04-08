import styles from './HealthIndicators.module.css'

interface HealthIndicatorsProps {
  averageProfitLast3: string
  revenueGrowth: string
  expenseGrowth: string
  trend: 'subindo' | 'descendo' | 'estavel'
  expenseGrowingFaster: string
}

export const HealthIndicators = ({
  averageProfitLast3,
  revenueGrowth,
  expenseGrowth,
  trend,
  expenseGrowingFaster
}: HealthIndicatorsProps): JSX.Element => {
  return (
    <div className={styles.grid}>
      <article className={styles.item}>
        <p className={styles.label}>Media de lucro (3 periodos)</p>
        <strong className={styles.value}>{averageProfitLast3}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>Crescimento da receita</p>
        <strong className={styles.value}>{revenueGrowth}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>Crescimento da despesa</p>
        <strong className={styles.value}>{expenseGrowth}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>Tendencia</p>
        <strong className={styles.value}>{trend}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>Despesa cresce mais rapido?</p>
        <strong className={styles.value}>{expenseGrowingFaster}</strong>
      </article>
    </div>
  )
}
