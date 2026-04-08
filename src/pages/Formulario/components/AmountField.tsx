import styles from '../Formulario.module.css'
import { FormField } from '../../../components/molecules/FormField/FormField'

interface AmountFieldProps {
  value: string
  onChange: (value: string) => void
}

export const AmountField = ({ value, onChange }: AmountFieldProps): JSX.Element => {
  return (
    <FormField label="Valor" className={styles.field}>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0.00"
      />
    </FormField>
  )
}
