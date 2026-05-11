import { FiCalendar, FiClock, FiUploadCloud } from 'react-icons/fi'
import type { AuditSliceCardItem } from '../auditoria.utils'
import styles from '../Auditoria.module.css'

interface AuditCardProps {
  item: AuditSliceCardItem
  isUploading?: boolean
  onUploadCertificate?: (item: AuditSliceCardItem, file: File) => void
}

export const AuditCard = ({ item, isUploading = false, onUploadCertificate }: AuditCardProps): JSX.Element => (
  <article className={styles.auditCard}>
    <div className={styles.cardTop}>
      <strong>{item.sliceLabel}</strong>
      <span className={`${styles.badge} ${styles[item.tone]}`.trim()}>{item.statusLabel}</span>
    </div>
    <p className={styles.metaRow}>
      <FiCalendar aria-hidden />
      <span>{item.periodLabel}</span>
    </p>
    <p className={styles.metaRow}>
      <FiClock aria-hidden />
      <span>Liberacao: {item.unlockLabel}</span>
    </p>
    {item.status === 'pending' ? (
      <label className={`${styles.uploadCertificateButton} ${!item.canUploadCertificate || isUploading ? styles.disabledAction : ''}`.trim()}>
        <FiUploadCloud aria-hidden />
        <span>{isUploading ? 'Enviando...' : item.canUploadCertificate ? 'Enviar certificado' : 'Aguardando liberacao'}</span>
        <input
          type="file"
          accept="application/json,.json"
          disabled={!item.canUploadCertificate || isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file || !item.canUploadCertificate || isUploading) return
            onUploadCertificate?.(item, file)
          }}
        />
      </label>
    ) : null}
  </article>
)
