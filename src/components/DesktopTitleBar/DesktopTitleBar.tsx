import { useEffect, useMemo, useState } from 'react'
import styles from './DesktopTitleBar.module.css'

const APP_TITLE = 'ChatFinacial'

export const DesktopTitleBar = (): JSX.Element | null => {
  const controls = window.api?.windowControls
  const isDesktop = Boolean(controls)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isDesktop) {
      return
    }

    document.documentElement.style.setProperty('--desktop-titlebar-height', '42px')
    return () => {
      document.documentElement.style.setProperty('--desktop-titlebar-height', '0px')
    }
  }, [isDesktop])

  useEffect(() => {
    if (!controls) {
      return
    }

    void controls.isMaximized().then(setIsMaximized)
    const unsubscribe = controls.onMaximizedStateChange((value) => setIsMaximized(value))
    return unsubscribe
  }, [controls])

  const maximizeLabel = useMemo(() => (isMaximized ? 'Restaurar janela' : 'Maximizar janela'), [isMaximized])
  const maximizeIcon = useMemo(() => (isMaximized ? '❐' : '□'), [isMaximized])

  if (!isDesktop || !controls) {
    return null
  }

  return (
    <header className={styles.bar}>
      <div className={styles.dragRegion}>
        <div className={styles.brandDot} />
        <strong className={styles.title}>{APP_TITLE}</strong>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.control} onClick={() => void controls.minimize()} aria-label="Minimizar janela">
          <span>_</span>
        </button>
        <button
          type="button"
          className={styles.control}
          onClick={() => void controls.maximizeToggle()}
          aria-label={maximizeLabel}
        >
          <span>{maximizeIcon}</span>
        </button>
        <button type="button" className={`${styles.control} ${styles.close}`} onClick={() => void controls.close()} aria-label="Fechar janela">
          <span>×</span>
        </button>
      </div>
    </header>
  )
}
