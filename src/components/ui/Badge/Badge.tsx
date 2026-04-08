import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../utils'
import styles from './Badge.module.css'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

export const Badge = ({ variant = 'info', className, children, ...props }: BadgeProps): JSX.Element => {
  return (
    <span className={cx(styles.badge, styles[variant], className)} {...props}>
      {children}
    </span>
  )
}
