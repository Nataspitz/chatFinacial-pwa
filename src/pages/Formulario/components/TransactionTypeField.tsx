import type { TransactionType } from '../../../types/transaction.types'
import { SelectField } from '../../../components/molecules/SelectField/SelectField'

interface TransactionTypeFieldProps {
  value: TransactionType
  onChange: (value: TransactionType) => void
}

export const TransactionTypeField = ({ value, onChange }: TransactionTypeFieldProps): JSX.Element => {
  return (
    <SelectField label="Tipo" value={value} onChange={(event) => onChange(event.target.value as TransactionType)}>
        <option value="entrada">Entrada</option>
        <option value="saida">Saida</option>
    </SelectField>
  )
}
