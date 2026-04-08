import styles from './TrendIndicators.module.css'

interface TrendIndicatorsProps {
  variation: number | null
  trend: 'subindo' | 'descendo' | 'estavel'
  valuesVisible?: boolean
}

export const TrendIndicators = ({ variation, trend, valuesVisible = true }: TrendIndicatorsProps): JSX.Element => {
  const isUp = variation !== null && variation >= 0
  const indicatorClass = isUp ? styles.positive : styles.negative
  const variationLabel = variation === null ? 'Sem base de comparacao' : `${variation >= 0 ? '+' : ''}${variation.toFixed(2)}%`
  const visibleVariationLabel = valuesVisible ? variationLabel : '••••••'

  return (
    <section className={styles.wrapper}>
      <article className={styles.item}>
        <p className={styles.label}>Direcao do crescimento</p>
        <strong className={indicatorClass}>{isUp ? 'Subindo' : 'Caindo'}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>Variacao percentual</p>
        <strong className={indicatorClass}>{visibleVariationLabel}</strong>
      </article>
      <article className={styles.item}>
        <p className={styles.label}>Tendencia media</p>
        <strong className={styles.neutral}>{trend}</strong>
      </article>
    </section>
  )
}
