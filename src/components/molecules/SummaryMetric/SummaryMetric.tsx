import styles from './SummaryMetric.module.css'

interface SummaryMetricProps {
  label: string
  value: string
}

export const SummaryMetric = ({ label, value }: SummaryMetricProps): JSX.Element => {
  return (
    <span className={styles.item}>
      {label}: {value}
    </span>
  )
}
