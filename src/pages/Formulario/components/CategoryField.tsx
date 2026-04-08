import styles from '../Formulario.module.css'
import { FormField } from '../../../components/molecules/FormField/FormField'

interface CategoryFieldProps {
  value: string
  onChange: (value: string) => void
}

export const CategoryField = ({ value, onChange }: CategoryFieldProps): JSX.Element => {
  return (
    <FormField label="Categoria" className={styles.field}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex: Alimentacao"
      />
    </FormField>
  )
}
