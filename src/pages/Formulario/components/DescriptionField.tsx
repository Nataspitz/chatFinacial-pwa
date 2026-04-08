import styles from '../Formulario.module.css'
import { FormField } from '../../../components/molecules/FormField/FormField'

interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
}

export const DescriptionField = ({ value, onChange }: DescriptionFieldProps): JSX.Element => {
  return (
    <FormField label="Descricao" className={styles.field}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder="Descreva a transacao"
      />
    </FormField>
  )
}
