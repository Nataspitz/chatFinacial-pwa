import type { SelectHTMLAttributes } from 'react'
import styles from './SelectField.module.css'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export const SelectField = ({ label, children, ...props }: SelectFieldProps): JSX.Element => {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select className={styles.select} {...props}>
        {children}
      </select>
    </label>
  )
}
