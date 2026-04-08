import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../utils'
import styles from './SectionWrapper.module.css'

interface SectionWrapperProps extends HTMLAttributes<HTMLElement> {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export const SectionWrapper = ({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: SectionWrapperProps): JSX.Element => {
  return (
    <section className={cx(styles.section, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}
