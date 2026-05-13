import { ExecutiveCards } from '../ExecutiveCards/ExecutiveCards'
import { GrowthLineChart } from '../GrowthLineChart/GrowthLineChart'
import { HealthIndicators } from '../HealthIndicators/HealthIndicators'
import { PerformanceOverviewChart } from '../PerformanceOverviewChart/PerformanceOverviewChart'
import { RevenueExpenseBarChart } from '../RevenueExpenseBarChart/RevenueExpenseBarChart'
import { RoiSection } from '../RoiSection/RoiSection'
import { SectionContainer } from '../SectionContainer/SectionContainer'
import { TrendIndicators } from '../TrendIndicators/TrendIndicators'
import type { PerformanceOverviewPoint, TimePoint } from '../../types'
import styles from '../../Dashboard.module.css'

interface DashboardContentProps {
  periodLabel: string
  revenue: number
  expense: number
  executiveProfit: number
  executiveMargin: number | null
  variationAmount: number
  variationPercent: number | null
  performanceOverviewCurrentYearSeries: PerformanceOverviewPoint[]
  performanceOverviewTotalAnnualSeries: PerformanceOverviewPoint[]
  performanceOverviewCurrentYear: number
  lineSeries: TimePoint[]
  healthSnapshot: {
    averageProfitLast3: number
    revenueGrowth: number | null
    expenseGrowth: number | null
    trend: 'subindo' | 'descendo' | 'estavel'
    expenseGrowingFaster: boolean | null
  }
  businessSettingsFailed: boolean
  investmentAmount: number | null
  accumulatedProfit: number
  roi: number | null
  valuesVisible: boolean
  formatCurrency: (value: number) => string
  formatPercent: (value: number | null) => string
  withPrivacyMask: (value: string) => string
}

export const DashboardContent = ({
  periodLabel,
  revenue,
  expense,
  executiveProfit,
  executiveMargin,
  variationAmount,
  variationPercent,
  performanceOverviewCurrentYearSeries,
  performanceOverviewTotalAnnualSeries,
  performanceOverviewCurrentYear,
  lineSeries,
  healthSnapshot,
  businessSettingsFailed,
  investmentAmount,
  accumulatedProfit,
  roi,
  valuesVisible,
  formatCurrency,
  formatPercent,
  withPrivacyMask
}: DashboardContentProps): JSX.Element => {
  const variationAmountLabel = `${variationAmount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(variationAmount))}`

  return (
    <div className={styles.layout}>
      <SectionContainer title="Resumo executivo" description={`Período selecionado: ${periodLabel}`}>
        <ExecutiveCards
          revenue={withPrivacyMask(formatCurrency(revenue))}
          expense={withPrivacyMask(formatCurrency(expense))}
          profit={withPrivacyMask(formatCurrency(executiveProfit))}
          margin={withPrivacyMask(formatPercent(executiveMargin))}
          variation={withPrivacyMask(variationAmountLabel)}
          variationPositive={variationAmount >= 0}
        />
      </SectionContainer>

      <SectionContainer
        title="Visao geral de desempenho"
        description="Saldo em conta por período (acumulado), sem considerar lançamentos futuros."
      >
        <PerformanceOverviewChart
          currentYear={performanceOverviewCurrentYear}
          currentYearData={performanceOverviewCurrentYearSeries}
          totalAnnualData={performanceOverviewTotalAnnualSeries}
        />
      </SectionContainer>

      <div className={styles.twoColumns}>
        <SectionContainer title="Evolução da receita" description="Faturamento por período (mês ou ano).">
          <GrowthLineChart data={lineSeries} />
        </SectionContainer>

        <SectionContainer title="Receita vs despesa" description="Comparativo do período selecionado.">
          <RevenueExpenseBarChart revenue={revenue} expense={expense} label={periodLabel} />
        </SectionContainer>
      </div>

      <SectionContainer title="Indicadores de saude" description="Metricas de performance operacional.">
        <HealthIndicators
          averageProfitLast3={withPrivacyMask(formatCurrency(healthSnapshot.averageProfitLast3))}
          revenueGrowth={withPrivacyMask(formatPercent(healthSnapshot.revenueGrowth))}
          expenseGrowth={withPrivacyMask(formatPercent(healthSnapshot.expenseGrowth))}
          trend={healthSnapshot.trend}
          expenseGrowingFaster={
            healthSnapshot.expenseGrowingFaster === null ? 'N/D' : healthSnapshot.expenseGrowingFaster ? 'Sim' : 'Não'
          }
        />
      </SectionContainer>

      <div className={styles.twoColumns}>
        <SectionContainer title="ROI e acumulado" description="Base para estrategia de investimento.">
          {businessSettingsFailed ? (
            <p className={styles.roiFallback}>Não foi possível carregar as configurações empresariais no momento.</p>
          ) : null}

          <RoiSection
            accumulatedProfit={withPrivacyMask(formatCurrency(accumulatedProfit))}
            roi={withPrivacyMask(formatPercent(roi))}
            investmentConfigured={investmentAmount !== null}
          />
        </SectionContainer>

        <SectionContainer title="Tendência e direção" description="Leitura rápida de aceleração ou desaceleração.">
          <TrendIndicators variation={variationPercent} trend={healthSnapshot.trend} valuesVisible={valuesVisible} />
        </SectionContainer>
      </div>
    </div>
  )
}
