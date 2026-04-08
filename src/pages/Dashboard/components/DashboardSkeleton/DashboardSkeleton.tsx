import styles from './DashboardSkeleton.module.css'

export const DashboardSkeleton = (): JSX.Element => {
  return (
    <section className={styles.page} aria-label="Carregando dashboard">
      <div className={styles.row}>
        <div className={styles.block} />
        <div className={styles.block} />
        <div className={styles.block} />
        <div className={styles.block} />
      </div>
      <div className={styles.chart} />
      <div className={styles.row}>
        <div className={styles.chartSmall} />
        <div className={styles.chartSmall} />
      </div>
    </section>
  )
}
