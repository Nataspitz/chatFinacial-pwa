import type { PropsWithChildren } from 'react'
import styles from './SectionContainer.module.css'

interface SectionContainerProps extends PropsWithChildren {
  title: string
  description?: string
}

export const SectionContainer = ({ title, description, children }: SectionContainerProps): JSX.Element => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </header>
      {children}
    </section>
  )
}
