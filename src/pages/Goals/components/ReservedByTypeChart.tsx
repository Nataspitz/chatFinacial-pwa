import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import styles from '../Goals.module.css'

interface ReservedByTypeChartProps {
  goals: number
  reserves: number
  provisions: number
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

export const ReservedByTypeChart = ({ goals, reserves, provisions }: ReservedByTypeChartProps): JSX.Element => {
  const data = [
    { name: 'Metas', value: Math.max(0, goals), color: '#7c3aed' },
    { name: 'Reservas', value: Math.max(0, reserves), color: '#0891b2' },
    { name: 'Provisões de contas', value: Math.max(0, provisions), color: '#ea580c' }
  ]
  const hasData = data.some((item) => item.value > 0)
  const chartData = hasData ? data : [{ name: 'Sem reservas', value: 1, color: 'var(--border-color)' }]

  return (
    <article className={styles.chartCard}>
      <header className={styles.chartHeader}>
        <h2>Reservas por tipo</h2>
        <p>Como o dinheiro reservado está dividido entre metas, reservas e provisões.</p>
      </header>

      <div className={styles.chartCanvas}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={82}
              paddingAngle={3}
              stroke="var(--card-bg)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [hasData ? formatCurrency(value) : 'Sem dados', name]}
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
        {data.map((item) => (
          <span key={item.name}>
            <i style={{ background: item.color }} />
            {item.name}: {formatCurrency(item.value)}
          </span>
        ))}
      </div>
    </article>
  )
}
