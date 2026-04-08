import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../utils'
import styles from './ContainerLayout.module.css'

interface ContainerLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const ContainerLayout = ({ children, className, ...props }: ContainerLayoutProps): JSX.Element => {
  return (
    <div className={cx(styles.container, className)} {...props}>
      {children}
    </div>
  )
}
