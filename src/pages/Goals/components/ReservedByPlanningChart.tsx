import type { CSSProperties } from 'react'
import styles from '../Goals.module.css'

interface ReservedByPlanningChartProps {
  data: Array<{
    id: string
    name: string
    reservedAmount: number
    targetAmount: number
    progressPercentage: number
  }>
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

export const ReservedByPlanningChart = ({ data }: ReservedByPlanningChartProps): JSX.Element => {
  const chartData = data
    .filter((item) => item.reservedAmount > 0 || item.targetAmount > 0)
    .slice()
    .sort((a, b) => b.reservedAmount - a.reservedAmount)
    .slice(0, 8)

  return (
    <article className={`${styles.chartCard} ${styles.chartCardWide}`}>
      <header className={styles.chartHeader}>
        <h2>Planejamentos por valor reservado</h2>
        <p>Comparação direta entre o reservado atual, alvo e progresso.</p>
      </header>

      {chartData.length === 0 ? (
        <p className={styles.chartEmpty}>Sem valores reservados ou alvos ativos para comparar.</p>
      ) : (
        <div className={styles.planningBarList}>
          {chartData.map((item) => (
            <div key={item.id} className={styles.planningBarRow}>
              <div className={styles.planningBarInfo}>
                <strong>{item.name}</strong>
                <span>
                  {formatCurrency(item.reservedAmount)} / {formatCurrency(item.targetAmount)} · {Math.round(item.progressPercentage)}%
                </span>
              </div>
              <div
                className={styles.planningBarTrack}
                style={{ '--planning-bar-progress': `${Math.max(2, item.progressPercentage)}%` } as CSSProperties}
                aria-label={`${item.name}: ${Math.round(item.progressPercentage)}% reservado`}
              >
                <span />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
