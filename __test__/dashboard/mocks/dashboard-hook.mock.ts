export const buildDashboardHookMock = () => ({
  accumulatedProfit: 1000,
  availableYears: [2026, 2025],
  businessSettings: null,
  businessSettingsFailed: false,
  performanceOverviewCurrentYearSeries: [
    { label: 'Jan', revenue: 500, expense: 100, profit: 400, cumulativeProfit: 400 },
    { label: 'Fev', revenue: 800, expense: 200, profit: 600, cumulativeProfit: 1000 }
  ],
  performanceOverviewTotalAnnualSeries: [
    { label: '2025', revenue: 1000, expense: 300, profit: 700, cumulativeProfit: 700 },
    { label: '2026', revenue: 1300, expense: 300, profit: 1000, cumulativeProfit: 1700 }
  ],
  performanceOverviewCurrentYear: 2026,
  currentTotals: { revenue: 1300, expense: 300, profit: 1000 },
  error: '',
  executiveCurrentTotals: { revenue: 1300, expense: 300, profit: 1000 },
  executiveMargin: 76.92,
  expenseGrowth: 10,
  hasDataInSelection: true,
  healthSnapshot: {
    averageProfitLast3: 450,
    revenueGrowth: 20,
    expenseGrowth: 10,
    trend: 'subindo' as const,
    expenseGrowingFaster: false
  },
  investmentAmount: null,
  isCompanySettingsModalOpen: false,
  isHelpPanelOpen: false,
  isLoading: false,
  isValuesVisible: true,
  lineSeries: [
    { label: '01/26', revenue: 500, expense: 100, profit: 400, year: 2026, month: 1 },
    { label: '02/26', revenue: 800, expense: 200, profit: 600, year: 2026, month: 2 }
  ],
  mode: 'monthly' as const,
  periodLabel: 'Abr/2026',
  profitVariationAmount: 100,
  profitVariation: 10,
  revenueGrowth: 20,
  roi: null,
  selectedMonth: 4,
  selectedYear: 2026,
  shouldShowEmptyState: false,
  shouldShowLoadedContent: true,
  withPrivacyMask: (value: string) => value,
  setMode: () => undefined,
  setSelectedYear: () => undefined,
  setSelectedMonth: () => undefined,
  setIsValuesVisible: () => undefined,
  openCompanySettingsModal: () => undefined,
  closeCompanySettingsModal: () => undefined,
  toggleHelpPanel: () => undefined,
  closeHelpPanel: () => undefined,
  handleBusinessSettingsSaved: () => undefined,
  formatCurrency: (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
  formatPercent: (value: number | null) => (value === null ? 'N/D' : `${value.toFixed(2)}%`)
})
