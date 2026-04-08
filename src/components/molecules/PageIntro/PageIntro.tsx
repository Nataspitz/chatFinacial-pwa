import type { ReactNode } from 'react'
import { cx } from '../../ui/utils'
import styles from './PageIntro.module.css'

interface PageIntroProps {
  title: string
  description: string
  titleTag?: 'h1' | 'h2'
  action?: ReactNode
  className?: string
}

export const PageIntro = ({
  title,
  description,
  titleTag = 'h1',
  action,
  className
}: PageIntroProps): JSX.Element => {
  const TitleTag = titleTag

  if (action) {
    return (
      <header className={cx(styles.header, styles.headerWithAction, className)}>
        <div>
          <TitleTag>{title}</TitleTag>
          <p className={styles.description}>{description}</p>
        </div>
        {action}
      </header>
    )
  }

  return (
    <header className={cx(styles.header, className)}>
      <TitleTag>{title}</TitleTag>
      <p className={styles.description}>{description}</p>
    </header>
  )
}
