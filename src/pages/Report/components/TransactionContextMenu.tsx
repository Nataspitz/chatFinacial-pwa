import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FiCopy, FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { TransactionContextMenuCoordinates } from './transactions-table.types'
import styles from '../Report.module.css'

interface TransactionContextMenuProps {
  coordinates: TransactionContextMenuCoordinates | null
  isDeleting: boolean
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onDuplicate: () => void
  onEdit: () => void
}

const MENU_WIDTH = 196
const MENU_HEIGHT = 156
const VIEWPORT_PADDING = 12

const getSafeCoordinates = (coordinates: TransactionContextMenuCoordinates): TransactionContextMenuCoordinates => {
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)
  const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - MENU_HEIGHT - VIEWPORT_PADDING)

  return {
    x: Math.min(Math.max(coordinates.x, VIEWPORT_PADDING), maxX),
    y: Math.min(Math.max(coordinates.y, VIEWPORT_PADDING), maxY)
  }
}

export const TransactionContextMenu = ({
  coordinates,
  isDeleting,
  isOpen,
  onClose,
  onDelete,
  onDuplicate,
  onEdit
}: TransactionContextMenuProps): JSX.Element | null => {
  const safeCoordinates = useMemo(() => {
    if (!isOpen || !coordinates) {
      return null
    }

    return getSafeCoordinates(coordinates)
  }, [coordinates, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !safeCoordinates) {
    return null
  }

  return createPortal(
    <>
      <button
        type="button"
        className={styles.contextMenuBackdrop}
        aria-label="Fechar menu de contexto"
        onClick={onClose}
      />

      <div
        className={styles.contextMenu}
        role="menu"
        style={{ left: safeCoordinates.x, top: safeCoordinates.y }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <button type="button" role="menuitem" className={styles.contextMenuItem} onClick={onEdit}>
          <FiEdit2 aria-hidden />
          <span>Editar</span>
        </button>

        <button type="button" role="menuitem" className={styles.contextMenuItem} onClick={onDuplicate}>
          <FiCopy aria-hidden />
          <span>Duplicar</span>
        </button>

        <button
          type="button"
          role="menuitem"
          className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`.trim()}
          disabled={isDeleting}
          onClick={onDelete}
        >
          <FiTrash2 aria-hidden />
          <span>{isDeleting ? 'Excluindo...' : 'Excluir'}</span>
        </button>
      </div>
    </>,
    document.body
  )
}
