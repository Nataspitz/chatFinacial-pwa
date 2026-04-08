import type { JSX, PropsWithChildren } from 'react'
import { cx } from '../../ui/utils'
import styles from './PageTemplate.module.css'

type PageWidth = 'narrow' | 'wide'

interface PageTemplateProps extends PropsWithChildren {
  width?: PageWidth
  className?: string
}

export const PageTemplate = ({ width = 'wide', className, children }: PageTemplateProps): JSX.Element => {
  return <section className={cx(styles.page, styles[width], className)}>{children}</section>
}
