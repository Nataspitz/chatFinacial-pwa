import { NavLink } from 'react-router-dom'
import {
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiCreditCard,
  FiGrid,
  FiLogOut,
  FiMessageCircle,
  FiSettings,
  FiShield
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Navbar.module.css'

interface NavigationItem {
  to: string
  label: string
  Icon: IconType
}

const primaryLinks: NavigationItem[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: FiGrid },
  { to: '/report', label: 'Report', Icon: FiBarChart2 },
  { to: '/goals', label: 'Planejamento', Icon: FiCreditCard },
  { to: '/notificacoes', label: 'Notificações', Icon: FiAlertCircle },
  { to: '/auditoria', label: 'Auditoria', Icon: FiShield },
  { to: '/chat', label: 'Chat', Icon: FiMessageCircle },
  { to: '/calendario', label: 'Calendário', Icon: FiCalendar }
]

const mobileLinks = primaryLinks.filter((link) => link.to !== '/chat')

const getLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.link} ${styles.active}` : styles.link

const getMobileLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink

const getIconButtonClassName = ({ isActive }: { isActive: boolean }): string =>
  isActive ? `${styles.iconButton} ${styles.active}` : styles.iconButton

interface SidebarBrandProps {
  greetingLabel: string
}

const SidebarBrand = ({ greetingLabel }: SidebarBrandProps): JSX.Element => (
  <header className={styles.brand}>
    <NavLink to="/chat" className={styles.brandIcon} aria-label="Abrir chat">
      CF
    </NavLink>
    <div>
      <strong className={styles.brandTitle}>ChatFinacial</strong>
      <p className={styles.brandUser}>{`Olá, ${greetingLabel}`}</p>
    </div>
  </header>
)

const SidebarNavigation = (): JSX.Element => (
  <nav className={styles.links} aria-label="Navegação principal">
    {primaryLinks.map(({ to, label, Icon }) => (
      <NavLink key={to} to={to} className={getLinkClassName}>
        <Icon aria-hidden />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
)

interface SidebarActionsProps {
  onSignOut: () => void
}

const SidebarActions = ({ onSignOut }: SidebarActionsProps): JSX.Element => (
  <div className={styles.actions}>
    <NavLink to="/settings" className={getLinkClassName}>
      <FiSettings aria-hidden />
      <span>Configurações</span>
    </NavLink>
    <button type="button" className={styles.actionButton} onClick={onSignOut}>
      <FiLogOut aria-hidden />
      <span>Sair</span>
    </button>
  </div>
)

interface MobileNavigationProps {
  onSignOut: () => void
}

const MobileNavigation = ({ onSignOut }: MobileNavigationProps): JSX.Element => (
  <>
    <header className={styles.mobileTopBar}>
      <strong>ChatFinacial</strong>
      <div className={styles.mobileTopActions}>
        <NavLink to="/chat" className={getIconButtonClassName} aria-label="Abrir chat">
          <FiMessageCircle aria-hidden />
        </NavLink>
        <NavLink to="/settings" className={styles.iconButton} aria-label="Abrir configurações">
          <FiSettings aria-hidden />
        </NavLink>
        <button type="button" className={styles.iconButton} onClick={onSignOut} aria-label="Sair">
          <FiLogOut aria-hidden />
        </button>
      </div>
    </header>

    <nav className={styles.mobileBottomNav} aria-label="Navegação mobile">
      {mobileLinks.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={getMobileLinkClassName}>
          <Icon aria-hidden />
          <span>{label === 'Planejamento' ? 'Caixa' : label}</span>
        </NavLink>
      ))}
    </nav>
  </>
)

export const Navbar = (): JSX.Element => {
  const { user, signOut } = useAuth()

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
  const greetingLabel = fullName || user?.email || 'Painel financeiro'

  return (
    <>
      <aside className={styles.sidebar}>
        <SidebarBrand greetingLabel={greetingLabel} />
        <SidebarNavigation />
        <SidebarActions onSignOut={() => void signOut()} />
      </aside>

      <MobileNavigation onSignOut={() => void signOut()} />
    </>
  )
}
