import styles from '../Report.module.css'

interface ResultFooterProps {
  resultBalance: number
  formatCurrency: (value: number) => string
}

export const ResultFooter = ({ resultBalance, formatCurrency }: ResultFooterProps): JSX.Element => {
  return (
    <footer className={styles.resultFooter}>
      <strong>Resultado: {formatCurrency(resultBalance)}</strong>
    </footer>
  )
}
