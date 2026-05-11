import { FiExternalLink } from 'react-icons/fi'
import { PageIntro } from '../../components/molecules/PageIntro/PageIntro'
import { PageTemplate } from '../../components/templates/PageTemplate/PageTemplate'
import { AUDITOR_AGENT_URL } from './auditoria.utils'
import { AuditActiveSection } from './components/AuditActiveSection'
import { AuditHistorySection } from './components/AuditHistorySection'
import { AuditNotice } from './components/AuditNotice'
import styles from './Auditoria.module.css'
import { useAuditoriaData } from './hooks/useAuditoriaData'

export const Auditoria = (): JSX.Element => {
  const {
    activeMonth,
    mandatoryMonth,
    isActiveMonthMandatory,
    isLoading,
    error,
    certificateFeedback,
    uploadingCertificateKey,
    activeSlices,
    upcomingMandatorySlices,
    historyByMonth,
    handleUploadCertificate
  } = useAuditoriaData()

  return (
    <PageTemplate className={styles.page}>
      <PageIntro
        title="Auditoria financeira"
        description="Controle das 3 auditorias mensais, com status ativo e histórico de meses auditados."
        action={
          <a
            className={styles.auditLinkButton}
            href={AUDITOR_AGENT_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <FiExternalLink aria-hidden />
            <span>Fazer auditoria</span>
          </a>
        }
      />

      <AuditNotice />

      {isLoading ? <p className={styles.stateMessage}>Carregando auditorias...</p> : null}
      {!isLoading && error ? <p className={styles.errorMessage}>{error}</p> : null}
      {!isLoading && certificateFeedback ? <p className={styles.stateMessage}>{certificateFeedback}</p> : null}

      {!isLoading && !error ? (
        <>
          <AuditActiveSection
            activeMonth={activeMonth}
            mandatoryMonth={mandatoryMonth}
            isActiveMonthMandatory={isActiveMonthMandatory}
            activeSlices={activeSlices}
            upcomingMandatorySlices={upcomingMandatorySlices}
            uploadingCertificateKey={uploadingCertificateKey}
            onUploadCertificate={(item, file) => void handleUploadCertificate(item, file)}
          />
          <AuditHistorySection historyByMonth={historyByMonth} />
        </>
      ) : null}
    </PageTemplate>
  )
}
