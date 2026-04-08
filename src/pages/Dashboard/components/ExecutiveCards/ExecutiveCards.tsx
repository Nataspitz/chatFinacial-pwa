import styles from './ExecutiveCards.module.css'

interface ExecutiveCardsProps {
  revenue: string
  expense: string
  profit: string
  margin: string
  variation: string
  variationPositive: boolean
}

interface ExecutiveCardItem {
  explanation: string
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'negative'
  variant: 'balance' | 'revenue' | 'expense' | 'margin' | 'variation'
}

export const ExecutiveCards = ({ revenue, expense, profit, margin, variation, variationPositive }: ExecutiveCardsProps): JSX.Element => {
  const items: ExecutiveCardItem[] = [
    {
      explanation: 'Total que entrou no caixa no periodo selecionado.',
      label: 'Receita do periodo',
      value: revenue,
      tone: 'positive',
      variant: 'revenue'
    },
    {
      explanation: 'Total que saiu do caixa no periodo selecionado.',
      label: 'Despesa do periodo',
      value: expense,
      tone: 'negative',
      variant: 'expense'
    },
    {
      explanation: 'Resultado final: receita menos despesa.',
      label: 'Lucro liquido',
      value: profit,
      tone: 'neutral',
      variant: 'balance'
    },
    {
      explanation: 'Percentual de lucro sobre a receita do periodo.',
      label: 'Margem',
      value: margin,
      tone: 'neutral',
      variant: 'margin'
    },
    {
      explanation: 'Quanto o lucro variou em relacao ao periodo anterior.',
      label: 'Variacao vs periodo anterior',
      value: variation,
      tone: variationPositive ? 'positive' : 'negative',
      variant: 'variation'
    }
  ]

  return (
    <section className={styles.grid} aria-label="Resumo executivo">
      {items.map((item) => (
        <article
          key={item.label}
          className={`${styles.card} ${styles[item.variant]}`}
          data-tooltip={item.explanation}
          title={item.explanation}
        >
          <p className={styles.label}>{item.label}</p>
          <strong className={[styles.value, styles[item.tone ?? 'neutral']].join(' ')}>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}
