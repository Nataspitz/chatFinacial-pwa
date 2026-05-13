import type { AuditSliceCardItem } from '../auditoria.utils'
import { formatMonthLabel } from '../auditoria.utils'
import styles from '../Auditoria.module.css'
import { AuditCard } from './AuditCard'
import { SkippedAuditCard } from './SkippedAuditCard'

interface AuditActiveSectionProps {
  activeMonth: string
  mandatoryMonth: string
  isActiveMonthMandatory: boolean
  activeSlices: AuditSliceCardItem[]
  upcomingMandatorySlices: AuditSliceCardItem[]
  uploadingCertificateKey: string | null
  onUploadCertificate: (item: AuditSliceCardItem, file: File) => void
}

export const AuditActiveSection = ({
  activeMonth,
  mandatoryMonth,
  isActiveMonthMandatory,
  activeSlices,
  upcomingMandatorySlices,
  uploadingCertificateKey,
  onUploadCertificate
}: AuditActiveSectionProps): JSX.Element => (
  <section className={styles.section}>
    <header className={styles.sectionHeader}>
      <h2>Auditorias ativas</h2>
      <span>{isActiveMonthMandatory ? formatMonthLabel(activeMonth) : formatMonthLabel(mandatoryMonth)}</span>
    </header>

    {isActiveMonthMandatory ? (
      activeSlices.length > 0 ? (
        <div className={styles.cardGrid}>
          {activeSlices.map((item) => (
            <AuditCard
              key={item.key}
              item={item}
              isUploading={uploadingCertificateKey === item.key}
              onUploadCertificate={onUploadCertificate}
            />
          ))}
        </div>
      ) : (
        <p className={styles.stateMessage}>Todas as auditorias liberadas deste mês já foram concluídas.</p>
      )
    ) : (
      <div className={styles.preMandatoryWrap}>
        <SkippedAuditCard />

        <div className={styles.cardGrid}>
          {upcomingMandatorySlices.map((item) => (
            <AuditCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    )}
  </section>
)
