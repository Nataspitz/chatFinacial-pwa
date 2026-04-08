import { useEffect, type ReactNode } from 'react'
import { Button } from '../Button/Button'
import styles from './ModalBase.module.css'

interface ModalBaseProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export const ModalBase = ({ open, title, onClose, children }: ModalBaseProps): JSX.Element | null => {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <Button variant="ghost" className={styles.closeButton} onClick={onClose}>
            Fechar
          </Button>
        </header>
        <div className={styles.content}>{children}</div>
      </section>
    </div>
  )
}
