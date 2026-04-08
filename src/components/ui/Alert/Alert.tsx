import type { HTMLAttributes } from 'react'
import { cx } from '../utils'
import styles from './Alert.module.css'

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title: string
  message: string
}

const ALERT_ICONS: Record<AlertVariant, string> = {
  success: '✓',
  warning: '!',
  danger: '×',
  info: 'i'
}

export const Alert = ({ variant = 'info', title, message, className, ...props }: AlertProps): JSX.Element => {
  return (
    <div role="alert" className={cx(styles.alert, styles[variant], className)} {...props}>
      <span aria-hidden="true" className={styles.icon}>
        {ALERT_ICONS[variant]}
      </span>
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  )
}
