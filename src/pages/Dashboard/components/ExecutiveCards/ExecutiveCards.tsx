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
      explanation: 'Total que entrou no caixa no período selecionado.',
      label: 'Receita do período',
      value: revenue,
      tone: 'positive',
      variant: 'revenue'
    },
    {
      explanation: 'Total que saiu do caixa no período selecionado.',
      label: 'Despesa do período',
      value: expense,
      tone: 'negative',
      variant: 'expense'
    },
    {
      explanation: 'Resultado final: receita menos despesa.',
      label: 'Lucro líquido',
      value: profit,
      tone: 'neutral',
      variant: 'balance'
    },
    {
      explanation: 'Percentual de lucro sobre a receita do período.',
      label: 'Margem',
      value: margin,
      tone: 'neutral',
      variant: 'margin'
    },
    {
      explanation: 'Diferença em reais do lucro em relação ao período anterior.',
      label: 'Variação vs período anterior',
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
