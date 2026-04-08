import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { TimePoint } from '../../types'
import styles from './GrowthLineChart.module.css'

interface GrowthLineChartProps {
  data: TimePoint[]
}

export const GrowthLineChart = ({ data }: GrowthLineChartProps): JSX.Element => {
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--border-color)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickMargin={8} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickMargin={8} width={72} />
          <Tooltip
            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)'
            }}
            cursor={{ stroke: 'var(--brand-500)', strokeWidth: 1, strokeOpacity: 0.35 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#3366ff"
            strokeWidth={2.4}
            dot={false}
            activeDot={{ r: 4, stroke: '#3366ff', strokeWidth: 2, fill: 'var(--bg-secondary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
