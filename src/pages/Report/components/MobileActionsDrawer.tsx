import { FiX } from 'react-icons/fi'
import { Button, ButtonLoading } from '../../../components/ui'
import styles from '../Report.module.css'

interface MobileActionsDrawerProps {
  open: boolean
  isExporting: boolean
  disabled: boolean
  onClose: () => void
  onCreate: () => void
  onManageCategories: () => void
  onExportReport: () => void
}

export const MobileActionsDrawer = ({
  open,
  isExporting,
  disabled,
  onClose,
  onCreate,
  onManageCategories,
  onExportReport
}: MobileActionsDrawerProps): JSX.Element | null => {
  if (!open) {
    return null
  }

  return (
    <div className={styles.mobileActionsDrawerOverlay} onClick={onClose}>
      <aside
        className={styles.mobileActionsDrawer}
        role="dialog"
        aria-label="Ações do relatório"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.mobileActionsDrawerHeader}>
          <strong>Ações</strong>
          <button
            type="button"
            className={styles.mobileActionsDrawerClose}
            aria-label="Fechar menu de ações"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>
        <div className={styles.mobileActionsDrawerButtons}>
          <Button type="button" variant="secondary" onClick={onCreate}>
            Nova transação
          </Button>
          <Button type="button" variant="ghost" onClick={onManageCategories}>
            Categorias
          </Button>
          <ButtonLoading
            type="button"
            variant="primary"
            loading={isExporting}
            disabled={disabled}
            onClick={onExportReport}
          >
            Exportar relatório
          </ButtonLoading>
        </div>
      </aside>
    </div>
  )
}
