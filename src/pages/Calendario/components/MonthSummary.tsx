import { SummaryMetric } from '../../../components/molecules/SummaryMetric/SummaryMetric'
import { SummaryList } from '../../../components/organisms/SummaryList/SummaryList'

interface MonthSummaryProps {
  totalEntrada: number
  totalSaida: number
  formatCurrency: (value: number) => string
}

export const MonthSummary = ({ totalEntrada, totalSaida, formatCurrency }: MonthSummaryProps): JSX.Element => {
  return (
    <SummaryList>
      <SummaryMetric label="Entradas do mes" value={formatCurrency(totalEntrada)} />
      <SummaryMetric label="Saidas do mes" value={formatCurrency(totalSaida)} />
    </SummaryList>
  )
}
