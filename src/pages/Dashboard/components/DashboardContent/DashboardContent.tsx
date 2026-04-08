import { Button } from '../../../../components/ui'
import { ExecutiveCards } from '../ExecutiveCards/ExecutiveCards'
import { GrowthLineChart } from '../GrowthLineChart/GrowthLineChart'
import { HealthIndicators } from '../HealthIndicators/HealthIndicators'
import { MonthlyCandleChart } from '../MonthlyCandleChart/MonthlyCandleChart'
import { RevenueExpenseBarChart } from '../RevenueExpenseBarChart/RevenueExpenseBarChart'
import { RoiSection } from '../RoiSection/RoiSection'
import { SectionContainer } from '../SectionContainer/SectionContainer'
import { TrendIndicators } from '../TrendIndicators/TrendIndicators'
import type { CandleDatum, DashboardViewMode, TimePoint } from '../../types'
import styles from '../../Dashboard.module.css'

interface DashboardContentProps {
  periodLabel: string
  mode: DashboardViewMode
  revenue: number
  expense: number
  executiveProfit: number
  executiveMargin: number | null
  variation: number | null
  candleSeries: CandleDatum[]
  hasDataInSelection: boolean
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
  onOpenCompanySettings: () => void
}

export const DashboardContent = ({
  periodLabel,
  mode,
  revenue,
  expense,
  executiveProfit,
  executiveMargin,
  variation,
  candleSeries,
  hasDataInSelection,
  lineSeries,
  healthSnapshot,
  businessSettingsFailed,
  investmentAmount,
  accumulatedProfit,
  roi,
  valuesVisible,
  formatCurrency,
  formatPercent,
  withPrivacyMask,
  onOpenCompanySettings
}: DashboardContentProps): JSX.Element => {
  return (
    <div className={styles.layout}>
      <SectionContainer title="Resumo executivo" description={`Periodo selecionado: ${periodLabel}`}>
        <ExecutiveCards
          revenue={withPrivacyMask(formatCurrency(revenue))}
          expense={withPrivacyMask(formatCurrency(expense))}
          profit={withPrivacyMask(formatCurrency(executiveProfit))}
          margin={withPrivacyMask(formatPercent(executiveMargin))}
          variation={withPrivacyMask(formatPercent(variation))}
          variationPositive={(variation ?? 0) >= 0}
        />
      </SectionContainer>

      <SectionContainer title="Grafico de vela" description="Open, High, Low e Close do lucro acumulado no periodo.">
        <MonthlyCandleChart data={candleSeries} mode={mode} hasData={hasDataInSelection} />
      </SectionContainer>

      <div className={styles.twoColumns}>
        <SectionContainer title="Evolucao do lucro" description="Ultimos 12 meses.">
          <GrowthLineChart data={lineSeries} />
        </SectionContainer>

        <SectionContainer title="Receita vs despesa" description="Comparativo do periodo selecionado.">
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
            healthSnapshot.expenseGrowingFaster === null ? 'N/D' : healthSnapshot.expenseGrowingFaster ? 'Sim' : 'Nao'
          }
        />
      </SectionContainer>

      <div className={styles.twoColumns}>
        <SectionContainer title="ROI e acumulado" description="Base para estrategia de investimento.">
          {businessSettingsFailed ? (
            <p className={styles.roiFallback}>Nao foi possivel carregar as configuracoes empresariais no momento.</p>
          ) : null}

          {investmentAmount === null ? (
            <div className={styles.roiAlert}>
              <p>Configure o investimento inicial para calcular ROI.</p>
              <Button
                type="button"
                variant="secondary"
                className={styles.roiActionButton}
                onClick={onOpenCompanySettings}
              >
                Configurar investimento
              </Button>
            </div>
          ) : null}

          <RoiSection
            accumulatedProfit={withPrivacyMask(formatCurrency(accumulatedProfit))}
            roi={withPrivacyMask(formatPercent(roi))}
            investmentConfigured={investmentAmount !== null}
          />
        </SectionContainer>

        <SectionContainer title="Tendencia e direcao" description="Leitura rapida de aceleracao ou desaceleracao.">
          <TrendIndicators variation={variation} trend={healthSnapshot.trend} valuesVisible={valuesVisible} />
        </SectionContainer>
      </div>
    </div>
  )
}
