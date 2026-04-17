export const calendarDataMock = {
  currentMonth: new Date(2026, 3, 1),
  availableYears: [2026, 2025],
  monthTotalEntrada: 1000,
  monthTotalSaida: 450,
  isLoading: false,
  error: '',
  cells: [
    {
      key: '2026-04-17',
      date: new Date(2026, 3, 17),
      isCurrentMonth: true,
      totals: {
        entrada: 200,
        saida: 50
      }
    }
  ],
  todayKey: '2026-04-17',
  formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  goToPreviousMonth: () => undefined,
  goToNextMonth: () => undefined,
  onYearChange: () => undefined,
  formatMonthTitle: () => 'Abril 2026'
}
