import styles from '../Formulario.module.css'

interface MonthlyCostFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export const MonthlyCostField = ({ checked, onChange }: MonthlyCostFieldProps): JSX.Element => {
  return (
    <label className={styles.checkboxField}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>Marcar como custo mensal</span>
    </label>
  )
}
