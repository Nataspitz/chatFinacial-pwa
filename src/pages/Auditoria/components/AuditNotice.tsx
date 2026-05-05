import { FiShield } from 'react-icons/fi'
import styles from '../Auditoria.module.css'

export const AuditNotice = (): JSX.Element => (
  <section className={styles.notice}>
    <FiShield aria-hidden />
    <div>
      <strong>Regra atual</strong>
      <p>Abril/2026 está pulado. A partir de maio/2026 as auditorias mensais são obrigatórias.</p>
    </div>
  </section>
)
