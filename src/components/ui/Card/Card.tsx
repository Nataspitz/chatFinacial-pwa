import type { ReactNode } from 'react'
import { cx } from '../utils'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  className?: string
  gradientHeader?: boolean
  headerContent?: ReactNode
}

export const Card = ({ children, className, gradientHeader = false, headerContent }: CardProps): JSX.Element => {
  return (
    <article className={cx(styles.card, className)}>
      {gradientHeader && <header className={styles.header}>{headerContent}</header>}
      <div className={styles.content}>{children}</div>
    </article>
  )
}
