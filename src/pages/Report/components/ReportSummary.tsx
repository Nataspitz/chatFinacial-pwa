import { SummaryMetric } from '../../../components/molecules/SummaryMetric/SummaryMetric'
import { SummaryList } from '../../../components/organisms/SummaryList/SummaryList'

interface ReportSummaryProps {
  totalEntries: number
  totalOutcomes: number
  totalInstallments: number
  formatCurrency: (value: number) => string
}

export const ReportSummary = ({
  totalEntries,
  totalOutcomes,
  totalInstallments,
  formatCurrency
}: ReportSummaryProps): JSX.Element => {
  return (
    <SummaryList>
      <SummaryMetric label="Soma de entradas" value={formatCurrency(totalEntries)} />
      <SummaryMetric label="Soma de saídas" value={formatCurrency(totalOutcomes)} />
      <SummaryMetric label="Parcelas no período" value={formatCurrency(totalInstallments)} />
    </SummaryList>
  )
}
