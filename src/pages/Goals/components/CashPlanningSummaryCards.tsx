import type { CashPlanningSummary } from '../services/cashPlanningPageData'
import styles from '../Goals.module.css'

interface CashPlanningSummaryCardsProps {
  summary: CashPlanningSummary
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const CashPlanningSummaryCards = ({ summary }: CashPlanningSummaryCardsProps): JSX.Element => {
  const cards = [
    {
      title: 'Saldo em conta',
      value: formatCurrency(summary.accountBalance),
      description: 'Base atual do caixa.'
    },
    {
      title: 'Reservas ativas',
      value: formatCurrency(summary.reservedActive),
      description: 'Valor separado em metas, reservas e provisões.'
    },
    {
      title: 'Caixa livre real',
      value: formatCurrency(summary.realFreeCash),
      description: 'Saldo menos reservas marcadas.'
    },
    {
      title: 'Regras do mês',
      value: formatCurrency(summary.monthlyRuleTotal),
      description: summary.monthlyRuleTotal > 0
        ? 'Valor previsto para reservar este mês.'
        : 'Nenhuma regra mensal ativa.'
    },
    {
      title: 'Alvo ativo',
      value: formatCurrency(summary.activeTargetAmount),
      description: `${summary.activePlansCount} ${summary.activePlansCount === 1 ? 'planejamento ativo' : 'planejamentos ativos'}.`
    }
  ]

  return (
    <section className={styles.summaryGrid} aria-label="Resumo do planejamento de caixa">
      {cards.map((card) => (
        <article key={card.title} className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{card.title}</span>
          <strong className={styles.summaryValue}>{card.value}</strong>
          <span className={styles.summaryCaption}>{card.description}</span>
        </article>
      ))}
    </section>
  )
}
