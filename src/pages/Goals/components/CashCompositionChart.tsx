import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import styles from '../Goals.module.css'

interface CashCompositionChartProps {
  free: number
  reserved: number
  committed: number
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

export const CashCompositionChart = ({ free, reserved, committed }: CashCompositionChartProps): JSX.Element => {
  const data = [
    { name: 'Caixa livre', value: Math.max(0, free), color: '#2563eb' },
    { name: 'Reservas ativas', value: Math.max(0, reserved), color: '#16a34a' },
    { name: 'Compromissos futuros', value: Math.max(0, committed), color: '#f59e0b' }
  ]
  const hasData = data.some((item) => item.value > 0)
  const chartData = hasData ? data : [{ name: 'Sem valores', value: 1, color: 'var(--border-color)' }]

  return (
    <article className={styles.chartCard}>
      <header className={styles.chartHeader}>
        <h2>Composição do caixa</h2>
        <p>Quanto do saldo ainda está livre e quanto já tem destino.</p>
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
