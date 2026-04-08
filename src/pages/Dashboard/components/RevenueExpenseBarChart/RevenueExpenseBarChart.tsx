import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import styles from './RevenueExpenseBarChart.module.css'

interface RevenueExpenseBarChartProps {
  revenue: number
  expense: number
  label: string
}

export const RevenueExpenseBarChart = ({ revenue, expense, label }: RevenueExpenseBarChartProps): JSX.Element => {
  const data = [
    { name: 'Receita', value: revenue, color: '#16c784' },
    { name: 'Despesa', value: expense, color: '#ef4444' }
  ]

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={66}
            outerRadius={100}
            paddingAngle={3}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            stroke="var(--bg-secondary)"
            strokeWidth={1}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
            labelFormatter={() => label}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
