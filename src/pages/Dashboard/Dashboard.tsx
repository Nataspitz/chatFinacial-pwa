import { FiEye, FiEyeOff } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { Button } from '../../components/ui'
import { CompanySettingsModal } from './components/CompanySettingsModal/CompanySettingsModal'
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
          description="Acompanhamento de crescimento, margem, ROI e tendencias financeiras."
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
        description="Crescimento, margem, ROI, tendencia e analise mensal/ anual em uma unica visao."
        className={styles.pageHeader}
        action={
          <div className={styles.headerActions}>
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

      {dashboard.shouldShowEmptyState ? (
        <section className={styles.emptyState}>
          <h2>Nenhuma transacao encontrada</h2>
          <p>Registre transacoes para visualizar crescimento, margem, ROI e tendencias.</p>
        </section>
      ) : null}

      {dashboard.shouldShowLoadedContent ? (
        <DashboardContent
          periodLabel={dashboard.periodLabel}
          mode={dashboard.mode}
          revenue={dashboard.currentTotals.revenue}
          expense={dashboard.currentTotals.expense}
          executiveProfit={dashboard.executiveCurrentTotals.profit}
          executiveMargin={dashboard.executiveMargin}
          variation={dashboard.profitVariation}
          candleSeries={dashboard.candleSeries}
          hasDataInSelection={dashboard.hasDataInSelection}
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
          onOpenCompanySettings={dashboard.openCompanySettingsModal}
        />
      ) : null}

      <CompanySettingsModal
        open={dashboard.isCompanySettingsModalOpen}
        initialSettings={dashboard.businessSettings}
        onClose={dashboard.closeCompanySettingsModal}
        onSaved={dashboard.handleBusinessSettingsSaved}
      />

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
