import { NavLink } from 'react-router-dom'
import { FiCalendar, FiClipboard, FiFileText, FiLogOut, FiMessageCircle, FiSettings, FiShield, FiTarget } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Navbar.module.css'

const getLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

const getMobileLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink

export const Navbar = (): JSX.Element => {
  const { user, signOut } = useAuth()

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const greetingLabel = fullName || user?.email || 'Painel financeiro'

  return (
    <>
      <aside className={styles.sidebar}>
        <header className={styles.brand}>
          <span className={styles.brandIcon}>CF</span>
          <div>
            <strong className={styles.brandTitle}>ChatFinacial Mobile</strong>
            <p className={styles.brandUser}>{`Olá, ${greetingLabel}`}</p>
          </div>
        </header>

        <nav className={styles.links}>
          <NavLink to="/chat" className={getLinkClassName}>
            <FiMessageCircle aria-hidden />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/dashboard" className={getLinkClassName}>
            <FiClipboard aria-hidden />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/report" className={getLinkClassName}>
            <FiFileText aria-hidden />
            <span>Report</span>
          </NavLink>
          <NavLink to="/goals" className={getLinkClassName}>
            <FiTarget aria-hidden />
            <span>Metas</span>
          </NavLink>
          <NavLink to="/auditoria" className={getLinkClassName}>
            <FiShield aria-hidden />
            <span>Auditoria</span>
          </NavLink>
          <NavLink to="/calendario" className={getLinkClassName}>
            <FiCalendar aria-hidden />
            <span>Calendário</span>
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <NavLink to="/settings" className={getLinkClassName}>
            <FiSettings aria-hidden />
            <span>Configurações</span>
          </NavLink>
          <button type="button" className={`${styles.actionButton} ${styles.logoutButton}`} onClick={() => void signOut()}>
            <FiLogOut aria-hidden />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <header className={styles.mobileTopBar}>
        <strong>ChatFinacial</strong>
        <div className={styles.mobileTopActions}>
          <NavLink to="/settings" className={styles.iconButton} aria-label="Abrir configurações">
            <FiSettings aria-hidden />
          </NavLink>
          <button type="button" className={styles.iconButton} onClick={() => void signOut()}>
            <FiLogOut aria-hidden />
          </button>
        </div>
      </header>

      <nav className={styles.mobileBottomNav}>
        <NavLink to="/chat" className={getMobileLinkClassName}>
          <FiMessageCircle aria-hidden />
          <span>Chat</span>
        </NavLink>
        <NavLink to="/dashboard" className={getMobileLinkClassName}>
          <FiClipboard aria-hidden />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/report" className={getMobileLinkClassName}>
          <FiFileText aria-hidden />
          <span>Report</span>
        </NavLink>
        <NavLink to="/goals" className={getMobileLinkClassName}>
          <FiTarget aria-hidden />
          <span>Metas</span>
        </NavLink>
        <NavLink to="/auditoria" className={getMobileLinkClassName}>
          <FiShield aria-hidden />
          <span>Auditoria</span>
        </NavLink>
        <NavLink to="/calendario" className={getMobileLinkClassName}>
          <FiCalendar aria-hidden />
          <span>Calendário</span>
        </NavLink>
      </nav>
    </>
  )
}
