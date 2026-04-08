import { FiMenu } from 'react-icons/fi'
import { Button, ButtonLoading } from '../../../components/ui'
import { PageIntro } from '../../../components/molecules/PageIntro/PageIntro'
import styles from '../Report.module.css'

interface PageHeaderProps {
  onCreate: () => void
  onManageCategories: () => void
  onExport: () => void
  onOpenMobileActions: () => void
  isExporting: boolean
  disabled: boolean
}

export const PageHeader = ({
  onCreate,
  onManageCategories,
  onExport,
  onOpenMobileActions,
  isExporting,
  disabled
}: PageHeaderProps): JSX.Element => {
  return (
    <PageIntro
      title="Relatorio"
      description="Visualizacao de transacoes por conta."
      className={styles.pageHeader}
      action={
        <div className={styles.headerActions}>
          <div className={styles.desktopHeaderActions}>
            <Button type="button" variant="secondary" className={styles.addButton} onClick={onCreate}>
              Nova transacao
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
              onClick={onExport}
            >
              Exportar relatorio
            </ButtonLoading>
          </div>

          <button
            type="button"
            className={styles.mobileHeaderMenuButton}
            aria-label="Abrir acoes do relatorio"
            onClick={onOpenMobileActions}
          >
            <FiMenu />
          </button>
        </div>
      }
    />
  )
}
