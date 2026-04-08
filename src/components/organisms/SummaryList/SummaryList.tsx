import type { PropsWithChildren } from 'react'
import styles from './SummaryList.module.css'

export const SummaryList = ({ children }: PropsWithChildren): JSX.Element => {
  return <div className={styles.list}>{children}</div>
}
