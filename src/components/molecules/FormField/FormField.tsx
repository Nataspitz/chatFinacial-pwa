import type { PropsWithChildren } from 'react'
import styles from './FormField.module.css'

interface FormFieldProps extends PropsWithChildren {
  label: string
  helperText?: string
  className?: string
}

export const FormField = ({ label, helperText, className, children }: FormFieldProps): JSX.Element => {
  return (
    <label className={`${styles.field}${className ? ` ${className}` : ''}`}>
      <span className={styles.label}>{label}</span>
      {children}
      {helperText ? <small className={styles.helper}>{helperText}</small> : null}
    </label>
  )
}
