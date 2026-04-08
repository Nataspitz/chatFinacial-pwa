import type { PropsWithChildren } from 'react'
import styles from './AppLayout.module.css'

export const AppLayout = ({ children }: PropsWithChildren): JSX.Element => {
  return <div className={styles.container}>{children}</div>
}

export const AppLayoutContent = ({ children }: PropsWithChildren): JSX.Element => {
  return <main className={styles.content}>{children}</main>
}
