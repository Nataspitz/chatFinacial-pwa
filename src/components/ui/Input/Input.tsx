import type { InputHTMLAttributes } from 'react'
import { cx } from '../utils'
import styles from './Input.module.css'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = ({ className, ...props }: InputProps): JSX.Element => {
  return <input className={cx(styles.input, className)} {...props} />
}
