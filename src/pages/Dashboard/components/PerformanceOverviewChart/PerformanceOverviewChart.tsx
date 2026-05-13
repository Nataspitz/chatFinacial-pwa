import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  type TooltipProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { PerformanceOverviewPoint } from '../../types'
import styles from './PerformanceOverviewChart.module.css'

type PerformanceScope = 'current_year' | 'total_annual'

interface PerformanceOverviewChartProps {
  currentYear: number
  currentYearData: PerformanceOverviewPoint[]
  totalAnnualData: PerformanceOverviewPoint[]
}

interface PerformanceChartPoint extends PerformanceOverviewPoint {
  deltaFromPrevious: number | null
}

const formatCurrency = (value: number): string => `R$ ${value.toFixed(2)}`

const PerformanceTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>): JSX.Element | null => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const point = payload[0]?.payload as PerformanceChartPoint | undefined
  if (!point) {
    return null
  }

  const delta = point.deltaFromPrevious
  const isPositive = (delta ?? 0) >= 0

  return (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid var(--border-color)',
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '10px 12px',
        display: 'grid',
        gap: 4
      }}
    >
      <strong>{String(label)}</strong>
      <span>Saldo em conta: {formatCurrency(point.cumulativeProfit)}</span>
      <span style={{ color: delta === null ? 'var(--text-secondary)' : isPositive ? '#16a34a' : '#ef4444' }}>
        {delta === null
          ? 'Resultado vs mês anterior: sem base'
          : `Resultado vs mês anterior: ${isPositive ? '+' : '-'}${formatCurrency(Math.abs(delta))}`}
      </span>
    </div>
  )
}

export const PerformanceOverviewChart = ({
  currentYear,
  currentYearData,
  totalAnnualData
}: PerformanceOverviewChartProps): JSX.Element => {
  const [scope, setScope] = useState<PerformanceScope>('current_year')

  const chartData = useMemo<PerformanceChartPoint[]>(
    () => {
      const base = scope === 'current_year' ? currentYearData : totalAnnualData
      return base.map((item, index) => ({
        ...item,
        deltaFromPrevious: index === 0 ? null : item.cumulativeProfit - base[index - 1].cumulativeProfit
      }))
    },
    [scope, currentYearData, totalAnnualData]
  )

  if (chartData.length === 0) {
    return <p className={styles.empty}>Sem dados para montar a visão de desempenho.</p>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.scopeToggle} role="group" aria-label="Filtro da visão de desempenho">
        <button
          type="button"
          className={scope === 'current_year' ? `${styles.scopeButton} ${styles.scopeButtonActive}` : styles.scopeButton}
          onClick={() => setScope('current_year')}
        >
          Ano atual ({currentYear})
        </button>
        <button
          type="button"
          className={scope === 'total_annual' ? `${styles.scopeButton} ${styles.scopeButtonActive}` : styles.scopeButton}
          onClick={() => setScope('total_annual')}
        >
          Período total (anual)
        </button>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
            barCategoryGap="4%"
            barGap={0}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border-color)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickMargin={8} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickMargin={8} width={72} />
            <Tooltip
              content={<PerformanceTooltip />}
              cursor={{ stroke: 'var(--brand-500)', strokeWidth: 1, strokeOpacity: 0.35 }}
            />
            <Bar dataKey="cumulativeProfit" name="Saldo em conta" fill="#3366ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
