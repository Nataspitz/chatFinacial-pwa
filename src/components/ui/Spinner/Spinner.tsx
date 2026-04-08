import type { HTMLAttributes } from 'react'
import { cx } from '../utils'
import styles from './Spinner.module.css'

type SpinnerSize = 'sm' | 'md' | 'lg'
type SpinnerTone = 'brand' | 'text'

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize
  tone?: SpinnerTone
}

export const Spinner = ({ size = 'md', tone = 'brand', className, ...props }: SpinnerProps): JSX.Element => {
  return (
    <span
      aria-hidden="true"
      className={cx(styles.spinner, styles[size], tone === 'text' && styles.textTone, className)}
      {...props}
    />
  )
}
