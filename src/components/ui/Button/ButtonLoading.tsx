import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '../Spinner/Spinner'
import { cx } from '../utils'
import { Button, type ButtonVariant } from './Button'
import styles from './ButtonLoading.module.css'

interface ButtonLoadingProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export const ButtonLoading = ({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonLoadingProps): JSX.Element => {
  return (
    <Button
      variant={variant}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cx(styles.buttonLoading, loading && styles.loading, className)}
      {...props}
    >
      <span className={cx(loading && styles.loadingLabel)}>{children}</span>
      {loading && (
        <span className={styles.spinnerSlot}>
          <Spinner size="sm" tone="text" />
        </span>
      )}
    </Button>
  )
}
