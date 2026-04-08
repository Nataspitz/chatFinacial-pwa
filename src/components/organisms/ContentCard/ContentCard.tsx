import type { PropsWithChildren } from 'react'
import { cx } from '../../ui/utils'
import styles from './ContentCard.module.css'

interface ContentCardProps extends PropsWithChildren {
  title?: string
  className?: string
}

export const ContentCard = ({ title, className, children }: ContentCardProps): JSX.Element => {
  return (
    <section className={cx(styles.card, className)}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {children}
    </section>
  )
}
