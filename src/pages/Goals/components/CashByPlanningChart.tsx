import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import styles from '../Goals.module.css'

interface CashByPlanningChartProps {
  data: Array<{
    id: string
    name: string
    amount: number
    percentageOfAccount: number
  }>
}

const COLORS = [
  '#2563eb',
  '#16a34a',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#f59e0b',
  '#dc2626',
  '#0f766e',
  '#9333ea'
]

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

const formatPercent = (value: number): string =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value))}%`

export const CashByPlanningChart = ({ data }: CashByPlanningChartProps): JSX.Element => {
  const chartData = data
    .filter((item) => item.amount > 0)
    .map((item, index) => ({
      ...item,
      color: item.id === 'free-cash' ? '#2563eb' : COLORS[(index + 1) % COLORS.length]
    }))

  const hasData = chartData.length > 0
  const renderedData = hasData ? chartData : [{ id: 'empty', name: 'Sem valores', amount: 1, percentageOfAccount: 0, color: 'var(--border-color)' }]

  return (
    <article className={styles.chartCard}>
      <header className={styles.chartHeader}>
        <h2>Reparticoes no saldo</h2>
        <p>Quanto cada reparticao ocupa dentro do saldo total em conta.</p>
      </header>

      <div className={styles.chartCanvas}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={renderedData}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={82}
              paddingAngle={2}
              stroke="var(--card-bg)"
              strokeWidth={2}
            >
              {renderedData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, item) => {
                const payload = item.payload as { percentageOfAccount?: number }
                return [
                  hasData ? `${formatCurrency(value)} (${formatPercent(payload.percentageOfAccount ?? 0)})` : 'Sem dados',
                  name
                ]
              }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartLegend}>
        {chartData.map((item) => (
          <span key={item.id}>
            <i style={{ background: item.color }} />
            {item.name}: {formatCurrency(item.amount)} ({formatPercent(item.percentageOfAccount)})
          </span>
        ))}
      </div>
    </article>
  )
}
