import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../utils'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  children: ReactNode
}

export const Button = ({
  variant = 'primary',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps): JSX.Element => {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], fullWidth && styles.fullWidth, className)}
      {...props}
    >
      {children}
    </button>
  )
}
