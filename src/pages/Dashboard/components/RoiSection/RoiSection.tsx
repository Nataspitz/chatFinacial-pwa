import styles from './RoiSection.module.css'

interface RoiSectionProps {
  accumulatedProfit: string
  roi: string
  investmentConfigured: boolean
}

export const RoiSection = ({ accumulatedProfit, roi, investmentConfigured }: RoiSectionProps): JSX.Element => {
  return (
    <div className={styles.grid}>
      <article className={styles.item}>
        <p className={styles.label}>Lucro acumulado</p>
        <strong className={styles.value}>{accumulatedProfit}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>ROI</p>
        <strong className={styles.value}>{roi}</strong>
        {!investmentConfigured ? (
          <small className={styles.hint}>Indisponivel: investimento base ainda nao configurado.</small>
        ) : null}
      </article>
    </div>
  )
}
