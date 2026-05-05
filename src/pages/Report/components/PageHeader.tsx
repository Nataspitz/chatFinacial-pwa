import { FiMenu } from 'react-icons/fi'
import { Button, ButtonLoading } from '../../../components/ui'
import { PageIntro } from '../../../components/molecules/PageIntro/PageIntro'
import styles from '../Report.module.css'

interface PageHeaderProps {
  onCreate: () => void
  onManageCategories: () => void
  onExportReport: () => void
  onOpenMobileActions: () => void
  isExporting: boolean
  disabled: boolean
}

export const PageHeader = ({
  onCreate,
  onManageCategories,
  onExportReport,
  onOpenMobileActions,
  isExporting,
  disabled
}: PageHeaderProps): JSX.Element => {
  return (
    <PageIntro
      title="Relatório"
      description="Visualização de transações por conta."
      className={styles.pageHeader}
      action={
        <div className={styles.headerActions}>
          <div className={styles.desktopHeaderActions}>
            <Button type="button" variant="secondary" className={styles.addButton} onClick={onCreate}>
              Nova transação
            </Button>
            <Button type="button" variant="ghost" className={styles.addButton} onClick={onManageCategories}>
              Categorias
            </Button>
            <ButtonLoading
              type="button"
              variant="primary"
              className={styles.exportButton}
              loading={isExporting}
              disabled={disabled}
              onClick={onExportReport}
            >
              Relatório PDF
            </ButtonLoading>
          </div>

          <button
            type="button"
            className={styles.mobileHeaderMenuButton}
            aria-label="Abrir ações do relatório"
            onClick={onOpenMobileActions}
          >
            <FiMenu />
          </button>
        </div>
      }
    />
  )
}
