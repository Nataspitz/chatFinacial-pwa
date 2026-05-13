import { FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { Button, ButtonLoading } from '../../components/ui'
import { DashboardContent } from './components/DashboardContent/DashboardContent'
import { DashboardFilters } from './components/DashboardFilters/DashboardFilters'
import { DashboardSkeleton } from './components/DashboardSkeleton/DashboardSkeleton'
import { HelpPanel } from './components/HelpPanel/HelpPanel'
import { useDashboardData } from './hooks/useDashboardData'
import styles from './Dashboard.module.css'

export const Dashboard = (): JSX.Element => {
  const dashboard = useDashboardData()

  if (dashboard.isLoading) {
    return (
      <PageTemplate className={styles.page}>
        <PageIntro
          title="Dashboard Executiva"
          description="Acompanhamento de crescimento, margem, ROI e tendências financeiras."
          className={styles.pageHeader}
        />
        <DashboardSkeleton />
      </PageTemplate>
    )
  }

  return (
    <PageTemplate className={styles.page}>
      <PageIntro
        title="Dashboard Executiva"
        description="Crescimento, margem, ROI, tendência e análise mensal/anual em uma única visão."
        className={styles.pageHeader}
        action={
          <div className={styles.headerActions}>
            <ButtonLoading
              type="button"
              variant={dashboard.summarySource === 'database' ? 'secondary' : 'primary'}
              className={styles.valueVisibilityButton}
              loading={dashboard.isRefreshingSummaries}
              onClick={() => {
                void dashboard.refreshSummaries()
              }}
            >
              <FiRefreshCw aria-hidden />
              Atualizar resumo
            </ButtonLoading>
            <Button
              type="button"
              variant="ghost"
              className={styles.valueVisibilityButton}
              onClick={() => dashboard.setIsValuesVisible((prev) => !prev)}
              aria-label={dashboard.isValuesVisible ? 'Ocultar valores da dashboard' : 'Mostrar valores da dashboard'}
            >
              {dashboard.isValuesVisible ? <FiEye /> : <FiEyeOff />}
              {dashboard.isValuesVisible ? 'Ocultar valores' : 'Mostrar valores'}
            </Button>
          </div>
        }
      />

      <DashboardFilters
        selectedYear={dashboard.selectedYear}
        selectedMonth={dashboard.selectedMonth}
        mode={dashboard.mode}
        years={dashboard.availableYears}
        onYearChange={dashboard.setSelectedYear}
        onMonthChange={dashboard.setSelectedMonth}
        onModeChange={dashboard.setMode}
      />

      {dashboard.error ? <p className={styles.error}>{dashboard.error}</p> : null}
      {dashboard.summaryFeedback ? (
        <p className={dashboard.summaryFeedbackTone === 'error' ? styles.error : styles.summaryFeedback}>
          {dashboard.summaryFeedback}
        </p>
      ) : null}

      {dashboard.shouldShowEmptyState ? (
        <section className={styles.emptyState}>
          <h2>Nenhuma transação encontrada</h2>
          <p>Registre transações para visualizar crescimento, margem, ROI e tendências.</p>
        </section>
      ) : null}

      {dashboard.shouldShowLoadedContent ? (
        <DashboardContent
          periodLabel={dashboard.periodLabel}
          revenue={dashboard.currentTotals.revenue}
          expense={dashboard.currentTotals.expense}
          executiveProfit={dashboard.executiveCurrentTotals.profit}
          executiveMargin={dashboard.executiveMargin}
          variationAmount={dashboard.profitVariationAmount}
          variationPercent={dashboard.profitVariation}
          performanceOverviewCurrentYearSeries={dashboard.performanceOverviewCurrentYearSeries}
          performanceOverviewTotalAnnualSeries={dashboard.performanceOverviewTotalAnnualSeries}
          performanceOverviewCurrentYear={dashboard.performanceOverviewCurrentYear}
          lineSeries={dashboard.lineSeries}
          healthSnapshot={dashboard.healthSnapshot}
          businessSettingsFailed={dashboard.businessSettingsFailed}
          investmentAmount={dashboard.investmentAmount}
          accumulatedProfit={dashboard.accumulatedProfit}
          roi={dashboard.roi}
          valuesVisible={dashboard.isValuesVisible}
          formatCurrency={dashboard.formatCurrency}
          formatPercent={dashboard.formatPercent}
          withPrivacyMask={dashboard.withPrivacyMask}
        />
      ) : null}

      <button
        type="button"
        className={styles.helpFloatingButton}
        onClick={dashboard.toggleHelpPanel}
        aria-label="Abrir painel de ajuda da dashboard"
        aria-expanded={dashboard.isHelpPanelOpen}
      >
        ?
      </button>
      <HelpPanel open={dashboard.isHelpPanelOpen} onClose={dashboard.closeHelpPanel} />
    </PageTemplate>
  )
}
